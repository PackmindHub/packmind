import { PackmindLogger } from '@packmind/logger';
import {
  AbstractAIDelayedJob,
  getErrorMessage,
  IQueue,
  PackmindEventEmitterService,
  QueueListeners,
  WorkerListeners,
} from '@packmind/node-utils';
import { GitRepoService } from '@packmind/git';
import {
  DistributionStatus,
  FileModification,
  GitCommit,
  IGitPort,
  MARKETPLACE_DESCRIPTOR_FILENAME,
  Marketplace,
  MarketplaceDescriptor,
  MarketplaceDistribution,
  MarketplaceDistributionId,
  MarketplaceId,
  Package,
  PluginPublishedEvent,
  PluginPublishFailedEvent,
  PublishFailureReason,
  PublishPluginToMarketplaceJobInput,
  PublishPluginToMarketplaceJobOutput,
} from '@packmind/types';
import { IMarketplaceDistributionRepository } from '../../domain/repositories/IMarketplaceDistributionRepository';
import { IMarketplaceRepository } from '../../domain/repositories/IMarketplaceRepository';
import {
  applyPluginDescriptorMutation,
  buildPluginLockEntry,
} from '../services/PluginDescriptorMutator';
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

    try {
      const { distribution, marketplace, pkg } = await this.loadContext(input);

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

      const descriptorFile = await fetchMarketplaceDescriptorFile(
        this.gitPort,
        marketplaceGitRepo,
        marketplaceGitRepo.branch,
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

      const pluginSlug = pkg.slug;
      this.assertNoUnmanagedNameCollision({
        pluginSlug,
        descriptor,
        marketplaceName: marketplace.name,
      });

      const lockEntry = buildPluginLockEntry({
        pluginVersion: rendered.pluginVersion || PLUGIN_VERSION_FALLBACK,
        contentHash,
        lastPublishedAt: new Date(),
        lastPublishedBy: distribution.authorId,
      });

      const nextDescriptor = applyPluginDescriptorMutation(descriptor, {
        pluginSlug,
        pluginName: rendered.pluginName,
        pluginVersion: rendered.pluginVersion || PLUGIN_VERSION_FALLBACK,
        lockEntry,
      });

      const descriptorFileUpdate: FileModification = {
        path: descriptorFile.path ?? MARKETPLACE_DESCRIPTOR_FILENAME,
        content: this.serializeDescriptor(nextDescriptor),
      };

      const fileModifications: FileModification[] = [
        ...pluginEntries.map<FileModification>((entry) => ({
          path: entry.path,
          content: entry.content,
        })),
        descriptorFileUpdate,
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
          return;
        }
        throw new PublishJobFailure('other', getErrorMessage(error));
      }

      await this.marketplaceDistributionRepository.updateStatus(
        input.marketplaceDistributionId,
        {
          status: DistributionStatus.success,
          contentHash,
          gitCommit: gitCommit?.sha,
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
          wasNoop: false,
        }),
      );
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
    if (descriptor.packmindLock !== undefined) {
      merged['packmindLock'] = descriptor.packmindLock;
    }
    return JSON.stringify(merged, null, 2);
  }

  private assertNoUnmanagedNameCollision(params: {
    pluginSlug: string;
    descriptor: MarketplaceDescriptor;
    marketplaceName: string;
  }): void {
    const { pluginSlug, descriptor, marketplaceName } = params;
    const managedSlugs = new Set<string>(
      Object.keys(descriptor.packmindLock?.plugins ?? {}),
    );
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
 * Type-helper re-export so `MarketplaceId` consumers stay in lockstep when
 * the schema/types update.
 */
export type { MarketplaceId };
