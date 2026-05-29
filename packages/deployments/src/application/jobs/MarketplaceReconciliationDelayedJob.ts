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
  IGitPort,
  MARKETPLACE_DESCRIPTOR_FILENAME,
  MarketplaceDescriptor,
  MarketplaceId,
  MarketplaceReconciliationJobInput,
  MarketplaceReconciliationJobOutput,
  MarketplaceState,
} from '@packmind/types';
import { Job } from 'bullmq';
import { IMarketplaceRepository } from '../../domain/repositories/IMarketplaceRepository';
import { MarketplaceDescriptorParserRegistry } from '../services/MarketplaceDescriptorParserRegistry';

/**
 * Default cron pattern for the marketplace reconciliation sweep. Configurable
 * at runtime via the `MARKETPLACE_RECONCILIATION_CRON` env var; falls back to
 * every 30 minutes to match the spec.
 */
export const DEFAULT_MARKETPLACE_RECONCILIATION_CRON = '*/30 * * * *';

/**
 * Compute the deterministic BullMQ `jobId` used for a marketplace's
 * repeatable reconciliation schedule. Exposed so `UnlinkMarketplaceUseCase`
 * can target the same id without hard-coding the format inline.
 */
export function buildMarketplaceReconciliationJobId(
  marketplaceId: MarketplaceId,
): string {
  return `marketplace-reconciliation:${marketplaceId}`;
}

/**
 * Resolve the active reconciliation cron pattern from the environment.
 */
export function resolveMarketplaceReconciliationCron(): string {
  const fromEnv = process.env['MARKETPLACE_RECONCILIATION_CRON'];
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv;
  }
  return DEFAULT_MARKETPLACE_RECONCILIATION_CRON;
}

const logOrigin = 'MarketplaceReconciliationDelayedJob';

/**
 * Periodic reconciliation job for an org-linked marketplace.
 *
 * For each scheduled run the worker:
 *  1. Loads the marketplace row by id. If soft-deleted or missing → skip
 *     (return the current/known state with `lastValidatedAt = now`).
 *  2. Resolves the marketplace-typed `GitRepo` via `GitRepoService`. Missing
 *     repo → `state='unreachable'`.
 *  3. Fetches `marketplace.json` via `IGitPort.getFileFromRepo`. Any fetch
 *     failure (network, 404, etc.) → `state='unreachable'`, descriptor
 *     unchanged.
 *  4. Parses the file via `MarketplaceDescriptorParserRegistry`. Parser
 *     failures map to `state='unreachable'` (closest meaningful state per
 *     spec — the descriptor is no longer parseable from the source).
 *  5. Diff against the stored descriptor (deep-equal modulo `raw`):
 *       - identical → `state='healthy'`
 *       - changed   → `state='drift'`; persist new descriptor + new
 *         pluginCount
 *  6. Persist via `IMarketplaceRepository.updateState`.
 *
 * PII compliance: marketplace name, owner/repo and ids are safe to log; any
 * potential PII (e.g., committer email lifted from descriptor metadata) is
 * never surfaced in this job's logs. See
 * `standard-compliance-logging-personal-information.md`.
 */
export class MarketplaceReconciliationDelayedJob extends AbstractAIDelayedJob<
  MarketplaceReconciliationJobInput,
  MarketplaceReconciliationJobOutput
> {
  readonly origin = logOrigin;

  constructor(
    queueFactory: (
      queueListeners: Partial<QueueListeners>,
    ) => Promise<
      IQueue<
        MarketplaceReconciliationJobInput,
        MarketplaceReconciliationJobOutput
      >
    >,
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
      `[${this.origin}] Job ${jobId} failed — marketplace state was not updated`,
    );
  }

  /**
   * Schedule (or re-arm) the repeatable reconciliation cron for a marketplace.
   *
   * The repeatable job is keyed by a deterministic `jobId` derived from the
   * marketplaceId so re-running the link path is idempotent — BullMQ will
   * overwrite the existing schedule rather than stacking duplicates.
   */
  async scheduleRecurring(
    marketplaceId: MarketplaceId,
    pattern: string = resolveMarketplaceReconciliationCron(),
  ): Promise<void> {
    await this.initialize();
    const jobId = buildMarketplaceReconciliationJobId(marketplaceId);
    await this.queue.addJob(
      this.getJobName({ marketplaceId }),
      { marketplaceId, timeout: this.DEFAULT_JOB_TIMEOUT },
      {
        jobId,
        repeat: { pattern },
      },
    );
    this.logger.info(
      `[${this.origin}] Scheduled repeatable reconciliation for ${marketplaceId}`,
      { marketplaceId, pattern, jobId },
    );
  }

  /**
   * Cancel the repeatable reconciliation cron for a marketplace.
   *
   * Used by `UnlinkMarketplaceUseCase` so an unlinked marketplace stops
   * accumulating background work. Safe to call when no schedule exists — the
   * underlying BullMQ remove is a no-op in that case.
   */
  async cancelRecurring(
    marketplaceId: MarketplaceId,
    pattern: string = resolveMarketplaceReconciliationCron(),
  ): Promise<void> {
    await this.initialize();
    const jobId = buildMarketplaceReconciliationJobId(marketplaceId);
    await this.queue.removeRepeatable(
      this.getJobName({ marketplaceId }),
      pattern,
      jobId,
    );
    this.logger.info(
      `[${this.origin}] Removed repeatable reconciliation for ${marketplaceId}`,
      { marketplaceId, pattern, jobId },
    );
  }

  async runJob(
    jobId: string,
    input: MarketplaceReconciliationJobInput,
    _controller: AbortController, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<MarketplaceReconciliationJobOutput> {
    const lastValidatedAt = new Date();
    this.logger.info(
      `[${this.origin}] Reconciling marketplace ${input.marketplaceId}`,
      { jobId, marketplaceId: input.marketplaceId },
    );

    // Step 1 — Load the marketplace.
    const marketplace = await this.marketplaceRepository.findById(
      input.marketplaceId,
    );
    if (!marketplace) {
      this.logger.info(
        `[${this.origin}] Marketplace ${input.marketplaceId} not found or soft-deleted — skipping`,
        { marketplaceId: input.marketplaceId },
      );
      return {
        state: 'unreachable',
        lastValidatedAt,
      };
    }

    // Step 2 — Resolve the underlying marketplace-typed GitRepo.
    const gitRepo = await this.gitRepoService.findMarketplaceGitRepoById(
      marketplace.gitRepoId,
    );
    if (!gitRepo) {
      this.logger.warn(
        `[${this.origin}] Marketplace GitRepo missing for marketplace ${marketplace.id}`,
        {
          marketplaceId: marketplace.id,
          gitRepoId: marketplace.gitRepoId,
        },
      );
      await this.marketplaceRepository.updateState(marketplace.id, {
        state: 'unreachable',
        lastValidatedAt,
      });
      return { state: 'unreachable', lastValidatedAt };
    }

    // Step 3 — Fetch the descriptor from git.
    let descriptorFile: { sha: string; content: string } | null;
    try {
      descriptorFile = await this.gitPort.getFileFromRepo(
        gitRepo,
        MARKETPLACE_DESCRIPTOR_FILENAME,
        gitRepo.branch,
      );
    } catch (error) {
      this.logger.warn(
        `[${this.origin}] Failed to fetch ${MARKETPLACE_DESCRIPTOR_FILENAME} for marketplace ${marketplace.id}`,
        {
          marketplaceId: marketplace.id,
          gitRepoId: marketplace.gitRepoId,
          owner: gitRepo.owner,
          repo: gitRepo.repo,
          error: getErrorMessage(error),
        },
      );
      await this.marketplaceRepository.updateState(marketplace.id, {
        state: 'unreachable',
        lastValidatedAt,
      });
      return { state: 'unreachable', lastValidatedAt };
    }

    if (!descriptorFile) {
      this.logger.warn(
        `[${this.origin}] ${MARKETPLACE_DESCRIPTOR_FILENAME} missing for marketplace ${marketplace.id}`,
        {
          marketplaceId: marketplace.id,
          gitRepoId: marketplace.gitRepoId,
          owner: gitRepo.owner,
          repo: gitRepo.repo,
        },
      );
      await this.marketplaceRepository.updateState(marketplace.id, {
        state: 'unreachable',
        lastValidatedAt,
      });
      return { state: 'unreachable', lastValidatedAt };
    }

    // Step 4 — Parse the descriptor.
    let descriptor: MarketplaceDescriptor;
    try {
      descriptor = this.parserRegistry.parse(descriptorFile.content);
    } catch (error) {
      this.logger.warn(
        `[${this.origin}] Failed to parse marketplace descriptor for ${marketplace.id}`,
        {
          marketplaceId: marketplace.id,
          gitRepoId: marketplace.gitRepoId,
          owner: gitRepo.owner,
          repo: gitRepo.repo,
          error: getErrorMessage(error),
        },
      );
      await this.marketplaceRepository.updateState(marketplace.id, {
        state: 'unreachable',
        lastValidatedAt,
      });
      return { state: 'unreachable', lastValidatedAt };
    }

    // Step 5 — Diff descriptor (ignoring `raw`).
    const state: MarketplaceState = descriptorsEquivalent(
      marketplace.descriptor,
      descriptor,
    )
      ? 'healthy'
      : 'drift';

    // Step 6 — Persist the update.
    if (state === 'drift') {
      await this.marketplaceRepository.updateState(marketplace.id, {
        state,
        lastValidatedAt,
        descriptor,
        pluginCount: descriptor.plugins.length,
      });
      this.logger.info(
        `[${this.origin}] Marketplace ${marketplace.id} drifted — descriptor updated`,
        {
          marketplaceId: marketplace.id,
          previousPluginCount: marketplace.pluginCount,
          newPluginCount: descriptor.plugins.length,
        },
      );
    } else {
      await this.marketplaceRepository.updateState(marketplace.id, {
        state,
        lastValidatedAt,
      });
      this.logger.info(
        `[${this.origin}] Marketplace ${marketplace.id} is healthy`,
        { marketplaceId: marketplace.id },
      );
    }

    return { state, lastValidatedAt };
  }

  getJobName(input: MarketplaceReconciliationJobInput): string {
    return `marketplace-reconciliation-${input.marketplaceId}`;
  }

  jobStartedInfo(input: MarketplaceReconciliationJobInput): string {
    return `marketplaceId: ${input.marketplaceId}`;
  }

  getWorkerListener(): Partial<
    WorkerListeners<
      MarketplaceReconciliationJobInput,
      MarketplaceReconciliationJobOutput
    >
  > {
    return {
      completed: async (
        job: Job<
          MarketplaceReconciliationJobInput,
          MarketplaceReconciliationJobOutput,
          string
        >,
        result: MarketplaceReconciliationJobOutput,
      ) => {
        this.logger.info(
          `[${this.origin}] Job ${job.id} completed — marketplace ${job.data.marketplaceId} state=${result.state}`,
          {
            marketplaceId: job.data.marketplaceId,
            state: result.state,
          },
        );
      },
      failed: async (job, error) => {
        this.logger.error(
          `[${this.origin}] Job ${job.id} failed for marketplace ${job.data.marketplaceId}: ${getErrorMessage(error)}`,
          {
            marketplaceId: job.data.marketplaceId,
          },
        );
      },
    };
  }
}

/**
 * Deep equality between two descriptors ignoring the `raw` payload (which is
 * a verbatim copy of the parsed JSON and so changes with formatting alone).
 */
function descriptorsEquivalent(
  a: MarketplaceDescriptor,
  b: MarketplaceDescriptor,
): boolean {
  const stripRaw = (
    descriptor: MarketplaceDescriptor,
  ): Omit<MarketplaceDescriptor, 'raw'> => ({
    vendor: descriptor.vendor,
    name: descriptor.name,
    version: descriptor.version,
    plugins: descriptor.plugins,
  });
  // Plain JSON equality is sufficient — `MarketplaceDescriptor` is a plain
  // structural type with primitives and arrays of plain objects.
  return JSON.stringify(stripRaw(a)) === JSON.stringify(stripRaw(b));
}
