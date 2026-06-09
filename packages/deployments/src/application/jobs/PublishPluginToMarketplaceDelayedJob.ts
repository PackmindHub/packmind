import { PackmindLogger } from '@packmind/logger';
import {
  AbstractAIDelayedJob,
  getErrorMessage,
  IQueue,
  PackmindEventEmitterService,
  QueueListeners,
  SSEEventPublisher,
  WorkerListeners,
} from '@packmind/node-utils';
import { GitRepoService } from '@packmind/git';
import {
  DistributionStatus,
  FileModification,
  GitCommit,
  GitProviderVendor,
  GitProviderVendors,
  GitRepo,
  IGitPort,
  MARKETPLACE_DESCRIPTOR_FILENAME,
  Marketplace,
  MarketplaceDescriptor,
  MarketplaceDistribution,
  MarketplaceDistributionId,
  MarketplaceId,
  Package,
  PackmindMarketplaceLock,
  PluginPublishedEvent,
  PluginPublishFailedEvent,
  PluginSource,
  PublishFailureReason,
  PublishPluginToMarketplaceJobInput,
  PublishPluginToMarketplaceJobOutput,
} from '@packmind/types';
import { IMarketplaceDistributionRepository } from '../../domain/repositories/IMarketplaceDistributionRepository';
import { IMarketplaceRepository } from '../../domain/repositories/IMarketplaceRepository';
import { applyPluginDescriptorMutation } from '../services/PluginDescriptorMutator';
import { applyPackmindMarketplaceLockMutation } from '../services/applyPackmindMarketplaceLockMutation';
import {
  fetchPackmindMarketplaceLock,
  PACKMIND_MARKETPLACE_LOCK_PATH,
  serializePackmindMarketplaceLock,
} from '../services/packmindMarketplaceLock';
import {
  buildPluginContentHash,
  PluginContentEntry,
} from '../services/buildPluginContentHash';
import {
  MARKETPLACE_SYNC_BRANCH,
  MARKETPLACE_SYNC_PR_TITLE,
} from '../services/marketplaceSyncPullRequest';
import { fetchMarketplaceDescriptorFile } from '../services/fetchMarketplaceDescriptorFile';
import { MarketplaceDescriptorParserRegistry } from '../services/MarketplaceDescriptorParserRegistry';
import { PackageService } from '../services/PackageService';
import { resolveMarketplaceReadBranch } from '../services/resolveMarketplaceReadBranch';

const logOrigin = 'PublishPluginToMarketplaceDelayedJob';

const PLUGIN_VERSION_FALLBACK = '0.1.0';

/**
 * Rendered plugin payload provided by an injected renderer callable.
 *
 * Injecting the renderer rather than the full use case keeps the job
 * testable without dragging the entire `RenderPackageAsPluginUseCase`
 * dependency graph into unit tests.
 */
export type PluginRendererResult = {
  files: PluginContentEntry[];
  pluginName: string;
  pluginVersion: string;
  pluginDescription?: string;
};

export type PluginRenderer = (params: {
  marketplace: Marketplace;
  package: Package;
  userId: string;
  organizationId: string;
}) => Promise<PluginRendererResult>;

/**
 * Background job that performs the Git side effects of a marketplace publish
 * attempt.
 *
 * Algorithm:
 *  1. Load the marketplace distribution row, marketplace and package.
 *  2. Render the plugin via the injected renderer (typically the
 *     `RenderPackageAsPluginUseCase`).
 *  3. Compute the content hash and short-circuit on no-op against the previous
 *     `success` row's hash.
 *  4. Refetch + reparse the marketplace descriptor (fresh read to surface any
 *     concurrent edit since the use case ran).
 *  5. Re-apply the name-collision check against unmanaged plugin entries.
 *  6. Mutate the descriptor through `PluginDescriptorMutator`.
 *  7. Push the rendered files + updated descriptor on the rolling
 *     `packmind/sync` branch via `IGitPort.commitToGit`. Catches the
 *     `NO_CHANGES_DETECTED` signal as a no-op.
 *  8. Persist the terminal status on the distribution row.
 *  9. Emit `PluginPublishedEvent` (success/no-op) or `PluginPublishFailedEvent`.
 *
 * BullMQ concurrency is intentionally constrained to a single worker — Git
 * operations on the rolling PR must be serialized.
 */
export class PublishPluginToMarketplaceDelayedJob extends AbstractAIDelayedJob<
  PublishPluginToMarketplaceJobInput,
  PublishPluginToMarketplaceJobOutput
> {
  readonly origin = logOrigin;

  constructor(
    queueFactory: (
      queueListeners: Partial<QueueListeners>,
    ) => Promise<
      IQueue<
        PublishPluginToMarketplaceJobInput,
        PublishPluginToMarketplaceJobOutput
      >
    >,
    private readonly marketplaceDistributionRepository: IMarketplaceDistributionRepository,
    private readonly marketplaceRepository: IMarketplaceRepository,
    private readonly packageService: PackageService,
    private readonly gitRepoService: GitRepoService,
    private readonly gitPort: IGitPort,
    private readonly parserRegistry: MarketplaceDescriptorParserRegistry,
    private readonly renderer: PluginRenderer,
    private readonly eventEmitterService: PackmindEventEmitterService,
    logger: PackmindLogger = new PackmindLogger(logOrigin),
  ) {
    super(queueFactory, logger);
  }

  async onFail(jobId: string): Promise<void> {
    this.logger.error(
      `[${this.origin}] Job ${jobId} failed — terminal status was updated in the failed listener`,
    );
  }

  async runJob(
    jobId: string,
    input: PublishPluginToMarketplaceJobInput,
    _controller: AbortController, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<PublishPluginToMarketplaceJobOutput> {
    this.logger.info(
      `[${this.origin}] Processing publish job ${jobId} for distribution ${input.marketplaceDistributionId}`,
      {
        marketplaceId: input.marketplaceId,
        packageId: input.packageId,
      },
    );

    // Hoist marketplace/package out of the try so the failure SSE notification
    // can still surface human-readable names when loadContext succeeded before
    // a later step threw.
    let marketplace: Marketplace | undefined;
    let pkg: Package | undefined;

    try {
      const context = await this.loadContext(input);
      marketplace = context.marketplace;
      pkg = context.pkg;
      const { distribution } = context;

      const rendered = await this.renderer({
        marketplace,
        package: pkg,
        userId: input.userId,
        organizationId: input.organizationId,
      });

      const pluginEntries: PluginContentEntry[] = rendered.files.map((f) => ({
        path: f.path,
        content: f.content,
      }));

      const contentHash = buildPluginContentHash(pluginEntries);

      // Short-circuit no-op against the previous success row's content hash.
      const previous =
        await this.marketplaceDistributionRepository.findLatestByPackageAndMarketplace(
          input.packageId,
          input.marketplaceId,
        );
      const wasNoopByHash =
        previous &&
        previous.id !== distribution.id &&
        previous.status === DistributionStatus.success &&
        previous.contentHash === contentHash;
      if (wasNoopByHash) {
        this.logger.info(
          `[${this.origin}] Plugin content unchanged since last publish; recording no_changes`,
          {
            marketplaceDistributionId: input.marketplaceDistributionId,
            contentHash,
          },
        );
        await this.marketplaceDistributionRepository.updateStatus(
          input.marketplaceDistributionId,
          {
            status: DistributionStatus.no_changes,
            contentHash,
          },
        );
        this.eventEmitterService.emit(
          new PluginPublishedEvent({
            userId: input.userId,
            organizationId: input.organizationId,
            source: 'ui',
            marketplaceDistributionId: input.marketplaceDistributionId,
            marketplaceId: input.marketplaceId,
            packageId: input.packageId,
            wasNoop: true,
          }),
        );
        await this.publishCompletedNotification({
          input,
          marketplace,
          pkg,
          status: 'no_changes',
        });
        return;
      }

      // Fresh-read the descriptor at job execution time to catch concurrent
      // edits since the use case acquired its snapshot.
      const marketplaceGitRepo =
        await this.gitRepoService.findMarketplaceGitRepoById(
          marketplace.gitRepoId,
        );
      if (!marketplaceGitRepo) {
        throw new PublishJobFailure(
          'descriptor_missing',
          'Marketplace git repo not found',
        );
      }

      // Read descriptor + lock from the rolling `packmind/sync` branch when
      // it already exists, so successive publishes accumulate plugin entries
      // on top of the previous publish's unmerged state. Falls back to the
      // marketplace's default branch on the first publish ever and on
      // post-merge republishes (where the merged entries now live on main).
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
        throw new PublishJobFailure(
          'descriptor_missing',
          `Marketplace descriptor missing at publish time on ${marketplaceGitRepo.owner}/${marketplaceGitRepo.repo}`,
        );
      }

      let descriptor: MarketplaceDescriptor;
      try {
        descriptor = this.parserRegistry.parse(descriptorFile.content);
      } catch (error) {
        throw new PublishJobFailure(
          'descriptor_missing',
          `Marketplace descriptor unparseable at publish time: ${getErrorMessage(error)}`,
        );
      }

      // Read the standalone packmind-lock.json from the same branch as the
      // descriptor — a missing file is the first-publish path and returns an
      // empty lock. A malformed lock is the same failure category as a
      // malformed descriptor: the marketplace is unhealthy and the publish
      // cannot proceed.
      let lock: PackmindMarketplaceLock;
      try {
        lock = await fetchPackmindMarketplaceLock(
          this.gitPort,
          marketplaceGitRepo,
          readBranch,
        );
      } catch (error) {
        throw new PublishJobFailure(
          'descriptor_missing',
          `packmind-lock.json is unparseable on ${marketplaceGitRepo.owner}/${marketplaceGitRepo.repo}: ${getErrorMessage(error)}`,
        );
      }

      const pluginSlug = pkg.slug;
      this.assertNoUnmanagedNameCollision({
        pluginSlug,
        descriptor,
        lock,
        marketplaceName: marketplace.name,
      });

      const nextLock = applyPackmindMarketplaceLockMutation(lock, {
        pluginSlug,
        pluginVersion: rendered.pluginVersion || PLUGIN_VERSION_FALLBACK,
        contentHash,
        lastPublishedAt: new Date(),
        lastPublishedBy: distribution.authorId,
      });

      const providerVendor = await this.resolveProviderVendor(
        marketplaceGitRepo,
        input,
      );
      const pluginSource: PluginSource = {
        source: 'git-subdir',
        url: buildMarketplaceCloneUrl(marketplaceGitRepo, providerVendor),
        path: `plugins/${pluginSlug}`,
      };

      const nextDescriptor = applyPluginDescriptorMutation(descriptor, {
        pluginSlug,
        pluginName: rendered.pluginName,
        pluginVersion: rendered.pluginVersion || PLUGIN_VERSION_FALLBACK,
        ...(rendered.pluginDescription !== undefined
          ? { pluginDescription: rendered.pluginDescription }
          : {}),
        pluginSource,
      });

      const fileModifications: FileModification[] = [
        ...pluginEntries.map<FileModification>((entry) => ({
          path: entry.path,
          content: entry.content,
        })),
        {
          path: descriptorFile.path ?? MARKETPLACE_DESCRIPTOR_FILENAME,
          content: this.serializeDescriptor(nextDescriptor),
        },
        {
          path: PACKMIND_MARKETPLACE_LOCK_PATH,
          content: serializePackmindMarketplaceLock(nextLock),
        },
      ];

      // The rolling PR is owned by the upstream Git host — the worker pushes
      // commits onto `packmind/sync` and lets the host's existing PR flow
      // surface or amend the request. The commit message is the rolling PR
      // title so reviewers see the Packmind-managed channel at a glance.
      const commitMessage = MARKETPLACE_SYNC_PR_TITLE;

      // Ensure the rolling-PR branch exists. First publish creates it from the
      // marketplace's default branch; subsequent publishes are a no-op.
      try {
        await this.gitPort.createBranchFromBase(
          marketplaceGitRepo,
          MARKETPLACE_SYNC_BRANCH,
        );
      } catch (error) {
        throw new PublishJobFailure(
          'other',
          `Failed to ensure rolling-PR branch: ${getErrorMessage(error)}`,
        );
      }

      let gitCommit: GitCommit | undefined;
      try {
        gitCommit = await this.gitPort.commitToGit(
          { ...marketplaceGitRepo, branch: MARKETPLACE_SYNC_BRANCH },
          fileModifications,
          commitMessage,
        );
      } catch (error) {
        if (error instanceof Error && error.message === 'NO_CHANGES_DETECTED') {
          // No new commit this run, but a prior publish may have landed a
          // commit on `packmind/sync` whose PR-open step transiently failed,
          // leaving the branch without a PR. Still ensure the rolling PR so
          // that orphaned branch self-heals instead of waiting for a manual
          // PR. Opening a PR with no commits ahead of base is a host-side
          // no-op and is swallowed inside the helper.
          const healedPrUrl = await this.ensureRollingPullRequest(
            marketplaceGitRepo,
            input.marketplaceDistributionId,
          );
          await this.marketplaceDistributionRepository.updateStatus(
            input.marketplaceDistributionId,
            {
              status: DistributionStatus.no_changes,
              contentHash,
              prUrl: healedPrUrl,
            },
          );
          this.eventEmitterService.emit(
            new PluginPublishedEvent({
              userId: input.userId,
              organizationId: input.organizationId,
              source: 'ui',
              marketplaceDistributionId: input.marketplaceDistributionId,
              marketplaceId: input.marketplaceId,
              packageId: input.packageId,
              wasNoop: true,
            }),
          );
          await this.publishCompletedNotification({
            input,
            marketplace,
            pkg,
            status: 'no_changes',
            prUrl: healedPrUrl,
          });
          return;
        }
        throw new PublishJobFailure('other', getErrorMessage(error));
      }

      // Ensure the rolling "Packmind sync" PR exists on the marketplace
      // repo (or amends the existing one). The commit already landed on
      // `packmind/sync` above — failing to surface the PR is logged but does
      // not roll back the publish.
      const prUrl = await this.ensureRollingPullRequest(
        marketplaceGitRepo,
        input.marketplaceDistributionId,
      );

      await this.marketplaceDistributionRepository.updateStatus(
        input.marketplaceDistributionId,
        {
          status: DistributionStatus.success,
          contentHash,
          gitCommit: gitCommit?.sha,
          prUrl,
        },
      );

      this.eventEmitterService.emit(
        new PluginPublishedEvent({
          userId: input.userId,
          organizationId: input.organizationId,
          source: 'ui',
          marketplaceDistributionId: input.marketplaceDistributionId,
          marketplaceId: input.marketplaceId,
          packageId: input.packageId,
          prUrl,
          wasNoop: false,
        }),
      );
      await this.publishCompletedNotification({
        input,
        marketplace,
        pkg,
        status: 'success',
        prUrl,
      });
    } catch (error) {
      const failureReason: PublishFailureReason =
        error instanceof PublishJobFailure ? error.reason : 'other';
      const errorMessage =
        error instanceof PublishJobFailure
          ? error.description
          : getErrorMessage(error);
      this.logger.error(
        `[${this.origin}] Publish job failed for distribution ${input.marketplaceDistributionId}`,
        {
          marketplaceDistributionId: input.marketplaceDistributionId,
          failureReason,
          error: errorMessage,
        },
      );

      await this.marketplaceDistributionRepository.updateStatus(
        input.marketplaceDistributionId,
        {
          status: DistributionStatus.failure,
          failureReason,
          error: errorMessage,
        },
      );

      this.eventEmitterService.emit(
        new PluginPublishFailedEvent({
          userId: input.userId,
          organizationId: input.organizationId,
          source: 'ui',
          marketplaceDistributionId: input.marketplaceDistributionId,
          marketplaceId: input.marketplaceId,
          packageId: input.packageId,
          failureReason,
        }),
      );
      await this.publishCompletedNotification({
        input,
        marketplace,
        pkg,
        status: 'failure',
        failureReason,
      });
    }
  }

  /**
   * Best-effort SSE notification to the user who triggered the publish so the
   * frontend can surface a terminal-state toast (with the rolling PR URL when
   * available). Never throws — a failure here must not derail the job's
   * terminal status which has already been persisted.
   */
  private async publishCompletedNotification(params: {
    input: PublishPluginToMarketplaceJobInput;
    marketplace: Marketplace | undefined;
    pkg: Package | undefined;
    status: 'success' | 'no_changes' | 'failure';
    prUrl?: string;
    failureReason?: PublishFailureReason;
  }): Promise<void> {
    const { input, marketplace, pkg, status, prUrl, failureReason } = params;
    try {
      await SSEEventPublisher.publishMarketplacePublishCompletedEvent({
        marketplaceDistributionId: input.marketplaceDistributionId,
        marketplaceId: input.marketplaceId,
        packageId: input.packageId,
        pluginSlug: pkg?.slug ?? '',
        packageName: pkg?.name ?? '',
        marketplaceName: marketplace?.name ?? '',
        status,
        userId: input.userId,
        prUrl,
        failureReason,
      });
    } catch (error) {
      this.logger.warn(
        `[${this.origin}] Failed to publish SSE completion notification for distribution ${input.marketplaceDistributionId}`,
        { error: getErrorMessage(error) },
      );
    }
  }

  /**
   * Ensure the rolling "Packmind sync" PR exists for the marketplace repo and
   * return its URL. Idempotent — amends the existing PR if one is open. A
   * failure here is logged but never rethrown: the commit (if any) already
   * landed on `packmind/sync`, and surfacing the PR is best-effort. Crucially
   * this is reachable on the `NO_CHANGES_DETECTED` path too, so a branch left
   * without a PR by a prior failed publish self-heals on the next attempt.
   */
  private async ensureRollingPullRequest(
    marketplaceGitRepo: GitRepo,
    marketplaceDistributionId: MarketplaceDistributionId,
  ): Promise<string | undefined> {
    try {
      const pr = await this.gitPort.openOrUpdatePullRequest(
        marketplaceGitRepo,
        {
          head: MARKETPLACE_SYNC_BRANCH,
          title: MARKETPLACE_SYNC_PR_TITLE,
          body: 'Packmind-managed plugin sync. Successive publishes amend this PR.',
        },
      );
      return pr.url;
    } catch (error) {
      this.logger.warn(
        `[${this.origin}] Failed to ensure rolling PR for distribution ${marketplaceDistributionId}`,
        { error: getErrorMessage(error) },
      );
      return undefined;
    }
  }

  private async loadContext(
    input: PublishPluginToMarketplaceJobInput,
  ): Promise<{
    distribution: MarketplaceDistribution;
    marketplace: Marketplace;
    pkg: Package;
  }> {
    const distribution = await this.marketplaceDistributionRepository.findById(
      input.marketplaceDistributionId,
    );
    if (!distribution) {
      throw new PublishJobFailure(
        'other',
        `Marketplace distribution ${input.marketplaceDistributionId} not found`,
      );
    }
    const marketplace = await this.marketplaceRepository.findById(
      input.marketplaceId,
    );
    if (!marketplace) {
      throw new PublishJobFailure(
        'other',
        `Marketplace ${input.marketplaceId} not found`,
      );
    }
    const pkg = await this.packageService.findById(input.packageId);
    if (!pkg) {
      throw new PublishJobFailure(
        'other',
        `Package ${input.packageId} not found`,
      );
    }
    return { distribution, marketplace, pkg };
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
    // repos disappear on the next publish — the lock now lives at the repo
    // root as a standalone packmind-lock.json file.
    delete merged['packmindLock'];
    return JSON.stringify(merged, null, 2);
  }

  /**
   * Look up the marketplace git repo's provider vendor so the plugin source
   * URL uses the right hostname. Falls back to `unknown` (which yields an
   * empty URL) if the provider cannot be resolved — preferable to throwing
   * because the publish is otherwise complete and a missing URL only breaks
   * downstream install-ability, not the upstream git operations.
   */
  private async resolveProviderVendor(
    gitRepo: GitRepo,
    input: PublishPluginToMarketplaceJobInput,
  ): Promise<GitProviderVendor> {
    try {
      const { providers } = await this.gitPort.listProviders({
        userId: input.userId,
        organizationId: input.organizationId,
      });
      const provider = providers.find((p) => p.id === gitRepo.providerId);
      return provider?.source ?? GitProviderVendors.unknown;
    } catch (error) {
      this.logger.warn(
        `[${this.origin}] Failed to resolve provider vendor for marketplace repo ${gitRepo.owner}/${gitRepo.repo}; falling back to unknown`,
        { error: getErrorMessage(error) },
      );
      return GitProviderVendors.unknown;
    }
  }

  private assertNoUnmanagedNameCollision(params: {
    pluginSlug: string;
    descriptor: MarketplaceDescriptor;
    lock: PackmindMarketplaceLock;
    marketplaceName: string;
  }): void {
    const { pluginSlug, descriptor, lock, marketplaceName } = params;
    const managedSlugs = new Set<string>(Object.keys(lock.plugins));
    const colliding = descriptor.plugins.find(
      (p) => p.slug === pluginSlug && !managedSlugs.has(p.slug),
    );
    if (colliding) {
      throw new PublishJobFailure(
        'name_conflict_unmanaged',
        `Cannot publish: plugin "${pluginSlug}" already exists on marketplace "${marketplaceName}" and is not managed by Packmind`,
      );
    }
  }

  getJobName(input: PublishPluginToMarketplaceJobInput): string {
    return `publish-plugin-to-marketplace-${input.marketplaceDistributionId}`;
  }

  jobStartedInfo(input: PublishPluginToMarketplaceJobInput): string {
    return `marketplaceDistributionId: ${input.marketplaceDistributionId}`;
  }

  getWorkerListener(): Partial<
    WorkerListeners<
      PublishPluginToMarketplaceJobInput,
      PublishPluginToMarketplaceJobOutput
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
        // The runJob path catches its own errors and updates the row to
        // `failure`. The failed listener fires only when an unhandled error
        // escapes — in which case we still persist the failure terminal state
        // so the row never stays `in_progress` indefinitely.
        try {
          await this.markFailureFromListener(
            job.data.marketplaceDistributionId,
            getErrorMessage(error),
          );
        } catch (updateError) {
          this.logger.error(
            `[${this.origin}] Failed to persist failure state in listener for job ${job.id}`,
            { error: getErrorMessage(updateError) },
          );
        }
      },
    };
  }

  private async markFailureFromListener(
    marketplaceDistributionId: MarketplaceDistributionId,
    errorMessage: string,
  ): Promise<void> {
    const current = await this.marketplaceDistributionRepository.findById(
      marketplaceDistributionId,
    );
    if (current && current.status === DistributionStatus.in_progress) {
      await this.marketplaceDistributionRepository.updateStatus(
        marketplaceDistributionId,
        {
          status: DistributionStatus.failure,
          failureReason: 'other',
          error: errorMessage,
        },
      );
    }
  }
}

/**
 * Helper error type used inside the job to carry a categorical failure
 * reason from any deep call site back to the terminal-status writer.
 */
class PublishJobFailure extends Error {
  constructor(
    public readonly reason: PublishFailureReason,
    public readonly description: string,
  ) {
    super(description);
    this.name = 'PublishJobFailure';
  }
}

/**
 * Build the HTTPS git clone URL for a marketplace repository so the
 * plugin entries written by the publish flow are install-able by
 * marketplace consumers (e.g. Claude Code's `git-subdir` plugin source).
 *
 * Mirrors the cloud-host convention used by
 * `listMarketplaces.usecase`'s `buildRepositoryWebUrl` helper, but appends
 * the `.git` suffix that `git clone` accepts. GitLab `owner` may itself be
 * a `group/subgroup` path — that is fine, the slashes carry through into a
 * valid URL.
 *
 * For an `unknown` provider vendor (or any unexpected value) the helper
 * returns an empty string so the upstream commit still lands; the
 * marketplace publish is the source-of-truth for the `source` block and a
 * later republish on a known-vendor provider corrects the entry.
 */
function buildMarketplaceCloneUrl(
  gitRepo: GitRepo,
  providerVendor: GitProviderVendor,
): string {
  switch (providerVendor) {
    case GitProviderVendors.github:
      return `https://github.com/${gitRepo.owner}/${gitRepo.repo}.git`;
    case GitProviderVendors.gitlab:
      return `https://gitlab.com/${gitRepo.owner}/${gitRepo.repo}.git`;
    default:
      return '';
  }
}

/**
 * Type-helper re-export so `MarketplaceId` consumers stay in lockstep when
 * the schema/types update.
 */
export type { MarketplaceId };
