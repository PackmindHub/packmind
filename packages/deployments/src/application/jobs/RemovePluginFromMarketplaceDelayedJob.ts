import { PackmindLogger } from '@packmind/logger';
import {
  AbstractAIDelayedJob,
  getErrorMessage,
  IQueue,
  QueueListeners,
  WorkerListeners,
} from '@packmind/node-utils';
import { GitRepoService } from '@packmind/git';
import {
  DeleteItem,
  DeleteItemType,
  FileModification,
  GitRepo,
  IGitPort,
  MARKETPLACE_DESCRIPTOR_FILENAME,
  Marketplace,
  MarketplaceDescriptor,
  MarketplaceDistribution,
  MarketplaceDistributionId,
  PackmindMarketplaceLock,
  RemovePluginFromMarketplaceJobInput,
  RemovePluginFromMarketplaceJobOutput,
} from '@packmind/types';
import { IMarketplaceDistributionRepository } from '../../domain/repositories/IMarketplaceDistributionRepository';
import { IMarketplaceRepository } from '../../domain/repositories/IMarketplaceRepository';
import { removePluginDescriptorEntry } from '../services/PluginDescriptorMutator';
import { removePackmindMarketplaceLockEntry } from '../services/applyPackmindMarketplaceLockMutation';
import {
  fetchPackmindMarketplaceLock,
  PACKMIND_MARKETPLACE_LOCK_PATH,
  serializePackmindMarketplaceLock,
} from '../services/packmindMarketplaceLock';
import {
  MARKETPLACE_SYNC_BRANCH,
  MARKETPLACE_SYNC_PR_TITLE,
} from '../services/marketplaceSyncPullRequest';
import { fetchMarketplaceDescriptorFile } from '../services/fetchMarketplaceDescriptorFile';
import { MarketplaceDescriptorParserRegistry } from '../services/MarketplaceDescriptorParserRegistry';
import { resolveMarketplaceReadBranch } from '../services/resolveMarketplaceReadBranch';

const logOrigin = 'RemovePluginFromMarketplaceDelayedJob';

/**
 * Background job that performs the Git side effects of retiring a published
 * marketplace plugin — the inverse of
 * `PublishPluginToMarketplaceDelayedJob`.
 *
 * Algorithm:
 *  1. Load the marketplace distribution row, marketplace and package.
 *  2. Ensure the rolling `packmind/sync` branch exists, then fresh-read +
 *     reparse the descriptor *from that branch* so the removal stacks on top
 *     of any pending publishes already accumulated on the PR rather than
 *     clobbering them.
 *  3. Drop the plugin entry from the descriptor via `PluginDescriptorMutator`.
 *  4. Push the updated descriptor + a directory delete for the plugin's files
 *     onto `packmind/sync` via `IGitPort.commitToGit`. `NO_CHANGES_DETECTED`
 *     (plugin already gone) is treated as a no-op.
 *
 * The distribution row stays in `to_be_removed`: the terminal `removed`
 * transition is owned by `MarketplaceReconciliationDelayedJob` once the
 * deletion PR merges and the slug disappears from the default-branch
 * descriptor. This job only updates the open PR.
 *
 * BullMQ concurrency is intentionally constrained to a single worker — Git
 * operations on the rolling PR must be serialized.
 */
export class RemovePluginFromMarketplaceDelayedJob extends AbstractAIDelayedJob<
  RemovePluginFromMarketplaceJobInput,
  RemovePluginFromMarketplaceJobOutput
> {
  readonly origin = logOrigin;

  constructor(
    queueFactory: (
      queueListeners: Partial<QueueListeners>,
    ) => Promise<
      IQueue<
        RemovePluginFromMarketplaceJobInput,
        RemovePluginFromMarketplaceJobOutput
      >
    >,
    private readonly marketplaceDistributionRepository: IMarketplaceDistributionRepository,
    private readonly marketplaceRepository: IMarketplaceRepository,
    private readonly gitRepoService: GitRepoService,
    private readonly gitPort: IGitPort,
    private readonly parserRegistry: MarketplaceDescriptorParserRegistry,
    logger: PackmindLogger = new PackmindLogger(logOrigin),
  ) {
    super(queueFactory, logger);
  }

  async onFail(jobId: string): Promise<void> {
    this.logger.error(
      `[${this.origin}] Job ${jobId} failed — distribution remains 'to_be_removed' for retry/reconciliation`,
    );
  }

  async runJob(
    jobId: string,
    input: RemovePluginFromMarketplaceJobInput,
    _controller: AbortController, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<RemovePluginFromMarketplaceJobOutput> {
    this.logger.info(
      `[${this.origin}] Processing removal job ${jobId} for distribution ${input.marketplaceDistributionId}`,
      {
        marketplaceId: input.marketplaceId,
        packageId: input.packageId,
      },
    );

    const { distribution, marketplace } = await this.loadContext(input);
    // The distribution stores the plugin slug captured at publish time
    // (`pluginSlug === package.slug`), so we never need the package itself —
    // critical for the package-deletion cascade where the package is gone.
    const pluginSlug = distribution.pluginSlug;

    const marketplaceGitRepo =
      await this.gitRepoService.findMarketplaceGitRepoById(
        marketplace.gitRepoId,
      );
    if (!marketplaceGitRepo) {
      throw new Error(
        `[${this.origin}] Marketplace git repo not found for marketplace ${input.marketplaceId}`,
      );
    }

    // Resolve which branch the descriptor + lock should be read from. When
    // the rolling `packmind/sync` branch already exists from a prior
    // publish/remove, that branch carries the accumulated unmerged state and
    // is the canonical source. Falls back to the default branch on the very
    // first sync-branch operation (the branch will be created from the
    // default branch right before the commit lands) and on post-merge
    // operations where the rolling branch has been deleted.
    const readBranch = await resolveMarketplaceReadBranch(
      this.gitPort,
      marketplaceGitRepo,
    );

    const descriptorFile = await fetchMarketplaceDescriptorFile(
      this.gitPort,
      marketplaceGitRepo,
      readBranch,
    );
    if (!descriptorFile) {
      throw new Error(
        `[${this.origin}] Marketplace descriptor missing on ${marketplaceGitRepo.owner}/${marketplaceGitRepo.repo}`,
      );
    }

    const descriptor: MarketplaceDescriptor = this.parserRegistry.parse(
      descriptorFile.content,
    );

    // Read the standalone packmind-lock.json from the same branch as the
    // descriptor. A missing lock yields the empty shape, which is fine — the
    // descriptor entry is dropped either way.
    const lock: PackmindMarketplaceLock = await fetchPackmindMarketplaceLock(
      this.gitPort,
      marketplaceGitRepo,
      readBranch,
    );

    // Ensure the rolling-PR branch exists before committing to it. First op
    // creates it from the marketplace's default branch; later ones no-op.
    await this.gitPort.createBranchFromBase(
      marketplaceGitRepo,
      MARKETPLACE_SYNC_BRANCH,
    );

    const nextDescriptor = removePluginDescriptorEntry(descriptor, pluginSlug);
    const nextLock = removePackmindMarketplaceLockEntry(lock, pluginSlug);

    const fileUpdates: FileModification[] = [
      {
        path: descriptorFile.path ?? MARKETPLACE_DESCRIPTOR_FILENAME,
        content: this.serializeDescriptor(nextDescriptor),
      },
      {
        path: PACKMIND_MARKETPLACE_LOCK_PATH,
        content: serializePackmindMarketplaceLock(nextLock),
      },
    ];

    // The plugin's rendered files live under `plugins/<slug>/` — mirrors the
    // `pluginRoot` the publish renderer writes to. Remove the whole directory.
    const deleteFiles: DeleteItem[] = [
      {
        path: `plugins/${pluginSlug}`,
        type: DeleteItemType.Directory,
      },
    ];

    try {
      await this.gitPort.commitToGit(
        { ...marketplaceGitRepo, branch: MARKETPLACE_SYNC_BRANCH },
        fileUpdates,
        MARKETPLACE_SYNC_PR_TITLE,
        deleteFiles,
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'NO_CHANGES_DETECTED') {
        this.logger.info(
          `[${this.origin}] Plugin "${pluginSlug}" already absent from the sync branch; nothing to commit`,
          { marketplaceDistributionId: input.marketplaceDistributionId },
        );
        // No new commit this run, but the deletion may already live on
        // `packmind/sync` from a prior run whose PR-open step transiently
        // failed. Still ensure the rolling PR so an orphaned branch
        // self-heals instead of waiting for a manual PR. Opening a PR with
        // no commits ahead of base is a no-op (the host rejects it) and is
        // swallowed inside the helper.
        await this.ensureRollingPullRequest(
          marketplaceGitRepo,
          input.marketplaceDistributionId,
        );
        return;
      }
      throw error;
    }

    // Ensure the rolling "Packmind sync" PR exists (idempotent — amends the
    // existing one). Mirrors the publish job. A PR-call failure after a
    // successful commit is logged but not rolled back: the deletion already
    // landed on `packmind/sync`.
    await this.ensureRollingPullRequest(
      marketplaceGitRepo,
      input.marketplaceDistributionId,
    );

    this.logger.info(
      `[${this.origin}] Committed removal of plugin "${pluginSlug}" to ${MARKETPLACE_SYNC_BRANCH}`,
      {
        marketplaceDistributionId: input.marketplaceDistributionId,
        marketplaceId: input.marketplaceId,
      },
    );
  }

  /**
   * Ensure the rolling "Packmind sync" PR exists for the marketplace repo.
   * Idempotent — amends the existing PR if one is open. A failure here is
   * logged but never rolled back or rethrown: the commit (if any) already
   * landed on `packmind/sync`, and surfacing the PR is best-effort. Crucially
   * this is reachable on the `NO_CHANGES_DETECTED` path too, so a branch left
   * without a PR by a prior failed run self-heals on the next attempt.
   */
  private async ensureRollingPullRequest(
    marketplaceGitRepo: GitRepo,
    marketplaceDistributionId: MarketplaceDistributionId,
  ): Promise<void> {
    try {
      await this.gitPort.openOrUpdatePullRequest(marketplaceGitRepo, {
        head: MARKETPLACE_SYNC_BRANCH,
        title: MARKETPLACE_SYNC_PR_TITLE,
        body: 'Packmind-managed plugin sync. Successive publishes amend this PR.',
      });
    } catch (error) {
      this.logger.warn(
        `[${this.origin}] Failed to ensure rolling PR for distribution ${marketplaceDistributionId}`,
        { error: getErrorMessage(error) },
      );
    }
  }

  private async loadContext(
    input: RemovePluginFromMarketplaceJobInput,
  ): Promise<{
    distribution: MarketplaceDistribution;
    marketplace: Marketplace;
  }> {
    const distribution = await this.marketplaceDistributionRepository.findById(
      input.marketplaceDistributionId,
    );
    if (!distribution) {
      throw new Error(
        `[${this.origin}] Marketplace distribution ${input.marketplaceDistributionId} not found`,
      );
    }
    const marketplace = await this.marketplaceRepository.findById(
      input.marketplaceId,
    );
    if (!marketplace) {
      throw new Error(
        `[${this.origin}] Marketplace ${input.marketplaceId} not found`,
      );
    }
    return { distribution, marketplace };
  }

  private serializeDescriptor(descriptor: MarketplaceDescriptor): string {
    // Merge the normalized fields back over the original raw JSON so any
    // unknown vendor-specific fields are preserved verbatim.
    const rawBase =
      typeof descriptor.raw === 'object' && descriptor.raw !== null
        ? (descriptor.raw as Record<string, unknown>)
        : {};
    const merged: Record<string, unknown> = {
      ...rawBase,
      name: descriptor.name,
      plugins: descriptor.plugins,
    };
    if (descriptor.version !== undefined) {
      merged['version'] = descriptor.version;
    }
    // Strip the legacy embedded packmindLock so orphan fields from existing
    // repos disappear on the next mutation — the lock now lives at the repo
    // root as a standalone packmind-lock.json file.
    delete merged['packmindLock'];
    return JSON.stringify(merged, null, 2);
  }

  getJobName(input: RemovePluginFromMarketplaceJobInput): string {
    return `remove-plugin-from-marketplace-${input.marketplaceDistributionId}`;
  }

  jobStartedInfo(input: RemovePluginFromMarketplaceJobInput): string {
    return `marketplaceDistributionId: ${input.marketplaceDistributionId}`;
  }

  getWorkerListener(): Partial<
    WorkerListeners<
      RemovePluginFromMarketplaceJobInput,
      RemovePluginFromMarketplaceJobOutput
    >
  > {
    return {
      completed: async (job) => {
        this.logger.info(
          `[${this.origin}] Job ${job.id} completed for distribution ${job.data.marketplaceDistributionId}`,
        );
      },
      failed: async (job, error) => {
        this.logger.error(
          `[${this.origin}] Job ${job.id} failed for distribution ${job.data.marketplaceDistributionId}: ${getErrorMessage(error)}`,
        );
      },
    };
  }
}
