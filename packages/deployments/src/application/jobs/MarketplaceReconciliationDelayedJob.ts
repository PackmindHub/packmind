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
  DistributionStatus,
  IGitPort,
  MARKETPLACE_DESCRIPTOR_FILENAME,
  MarketplaceDescriptor,
  MarketplaceErrorKind,
  MarketplaceId,
  MarketplaceReconciliationJobInput,
  MarketplaceReconciliationJobOutput,
  MarketplaceState,
  versionFingerprintsEqual,
} from '@packmind/types';
import { Job } from 'bullmq';
import { IMarketplaceDistributionRepository } from '../../domain/repositories/IMarketplaceDistributionRepository';
import { IMarketplaceRepository } from '../../domain/repositories/IMarketplaceRepository';
import { fetchMarketplaceDescriptorFile } from '../services/fetchMarketplaceDescriptorFile';
import { MARKETPLACE_SYNC_BRANCH } from '../services/marketplaceSyncPullRequest';
import { MarketplaceDescriptorParserRegistry } from '../services/MarketplaceDescriptorParserRegistry';
import { PackageService } from '../services/PackageService';
import { PackageVersionFingerprintService } from '../services/PackageVersionFingerprintService';

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
    private readonly marketplaceDistributionRepository: IMarketplaceDistributionRepository,
    private readonly gitRepoService: GitRepoService,
    private readonly gitPort: IGitPort,
    private readonly parserRegistry: MarketplaceDescriptorParserRegistry,
    private readonly packageService: PackageService,
    private readonly versionFingerprintService: PackageVersionFingerprintService,
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

  /**
   * Run a reconciliation sweep synchronously, outside the BullMQ worker, and
   * return the resulting state. Backs the member-triggered "Sync now" action so
   * the caller gets the fresh marketplace state in-band instead of waiting for
   * the next cron tick. Reuses the exact `runJob` logic — no duplication. The
   * abort controller is unused by `runJob`; a fresh one keeps the signature
   * satisfied.
   */
  async reconcileNow(
    marketplaceId: MarketplaceId,
  ): Promise<MarketplaceReconciliationJobOutput> {
    return this.runJob(
      `manual-reconcile-${marketplaceId}`,
      { marketplaceId },
      new AbortController(),
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
        errorKind: null,
        errorDetail: null,
        pendingPrUrl: null,
        outdatedPluginSlugs: null,
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
        errorKind: 'repo_not_found',
        errorDetail: ERROR_DETAIL_REPO_NOT_FOUND,
      });
      return {
        state: 'unreachable',
        lastValidatedAt,
        errorKind: 'repo_not_found',
        errorDetail: ERROR_DETAIL_REPO_NOT_FOUND,
        pendingPrUrl: marketplace.pendingPrUrl,
        outdatedPluginSlugs: marketplace.outdatedPluginSlugs,
      };
    }

    // Step 3 — Fetch the descriptor from git, probing the official
    // `.claude-plugin/marketplace.json` path first and falling back to a bare
    // root `marketplace.json`.
    let descriptorFile: Awaited<
      ReturnType<typeof fetchMarketplaceDescriptorFile>
    >;
    try {
      descriptorFile = await fetchMarketplaceDescriptorFile(
        this.gitPort,
        gitRepo,
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
      const { errorKind, errorDetail } = classifyFetchError(error);
      await this.marketplaceRepository.updateState(marketplace.id, {
        state: 'unreachable',
        lastValidatedAt,
        errorKind,
        errorDetail,
      });
      return {
        state: 'unreachable',
        lastValidatedAt,
        errorKind,
        errorDetail,
        pendingPrUrl: marketplace.pendingPrUrl,
        outdatedPluginSlugs: marketplace.outdatedPluginSlugs,
      };
    }

    if (!descriptorFile) {
      // A missing descriptor file is ambiguous: the repo may be gone/renamed
      // (404 on the contents path) or genuinely reachable with a broken
      // contract. Probe the repo itself to tell the two apart.
      const reachability =
        await this.gitPort.checkMarketplaceRepoExists(gitRepo);
      if (!reachability.exists) {
        const errorKind: MarketplaceErrorKind =
          reachability.reason ?? 'network_transient';
        const errorDetail =
          errorKind === 'repo_not_found'
            ? ERROR_DETAIL_REPO_NOT_FOUND
            : errorKind === 'auth_failed'
              ? ERROR_DETAIL_AUTH_FAILED
              : ERROR_DETAIL_NETWORK_TRANSIENT;
        this.logger.warn(
          `[${this.origin}] Marketplace ${marketplace.id} repo unreachable (${errorKind})`,
          {
            marketplaceId: marketplace.id,
            owner: gitRepo.owner,
            repo: gitRepo.repo,
          },
        );
        await this.marketplaceRepository.updateState(marketplace.id, {
          state: 'unreachable',
          lastValidatedAt,
          errorKind,
          errorDetail,
        });
        return {
          state: 'unreachable',
          lastValidatedAt,
          errorKind,
          errorDetail,
          pendingPrUrl: marketplace.pendingPrUrl,
          outdatedPluginSlugs: marketplace.outdatedPluginSlugs,
        };
      }

      // The repository was reachable but the descriptor file itself is
      // missing — this is a broken contract on the marketplace side, not a
      // transient network failure. Surface it as `bad_format` so admins can
      // tell the two apart from the marketplace list.
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
        state: 'bad_format',
        lastValidatedAt,
        errorKind: null,
        errorDetail: ERROR_DETAIL_BAD_FORMAT,
      });
      return {
        state: 'bad_format',
        lastValidatedAt,
        errorKind: null,
        errorDetail: ERROR_DETAIL_BAD_FORMAT,
        pendingPrUrl: marketplace.pendingPrUrl,
        outdatedPluginSlugs: marketplace.outdatedPluginSlugs,
      };
    }

    // Step 4 — Parse the descriptor.
    let descriptor: MarketplaceDescriptor;
    try {
      descriptor = this.parserRegistry.parse(descriptorFile.content);
    } catch (error) {
      // The file was reachable but unparseable — same broken-contract bucket
      // as a missing descriptor. Distinguishes from network/auth failures.
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
        state: 'bad_format',
        lastValidatedAt,
        errorKind: null,
        errorDetail: ERROR_DETAIL_BAD_FORMAT,
      });
      return {
        state: 'bad_format',
        lastValidatedAt,
        errorKind: null,
        errorDetail: ERROR_DETAIL_BAD_FORMAT,
        pendingPrUrl: marketplace.pendingPrUrl,
        outdatedPluginSlugs: marketplace.outdatedPluginSlugs,
      };
    }

    // Step 5 — Cross-check `MarketplaceDistribution` rows against the
    // descriptor's slug set. Two outcomes:
    //   (a) `to_be_removed` rows whose slug is no longer in the descriptor
    //       transition to terminal `removed` (no domain event).
    //   (b) `success` rows whose slug is absent AND not covered by a
    //       `to_be_removed` row contribute to drift detection.
    const descriptorSlugs = new Set(descriptor.plugins.map((p) => p.slug));
    const [successDistributions, pendingRemovalDistributions] =
      await Promise.all([
        this.marketplaceDistributionRepository.findSuccessfulByMarketplaceId(
          marketplace.id,
        ),
        this.marketplaceDistributionRepository.findPendingRemovalsByMarketplaceId(
          marketplace.id,
        ),
      ]);

    // (a) Transition `to_be_removed → removed` for slugs that vanished.
    const pendingRemovalSlugs = new Set<string>();
    for (const pending of pendingRemovalDistributions) {
      pendingRemovalSlugs.add(pending.pluginSlug);
      if (!descriptorSlugs.has(pending.pluginSlug)) {
        try {
          await this.marketplaceDistributionRepository.updateStatus(
            pending.id,
            { status: DistributionStatus.removed },
          );
          this.logger.info(
            `[${this.origin}] Marketplace plugin distribution transitioned to terminal removed`,
            {
              distributionId: pending.id,
              marketplaceId: marketplace.id,
              fromStatus: DistributionStatus.to_be_removed,
              toStatus: DistributionStatus.removed,
            },
          );
        } catch (error) {
          this.logger.error(
            `[${this.origin}] Failed to mark distribution as removed`,
            {
              distributionId: pending.id,
              marketplaceId: marketplace.id,
              error: getErrorMessage(error),
            },
          );
        }
      }
    }

    // (b) Drift detection (AC9, AC10): a slug carried by a `success`
    // distribution is missing AND is not in `pendingRemovalSlugs`.
    const driftedPluginSlugs: string[] = [];
    for (const live of successDistributions) {
      if (
        !descriptorSlugs.has(live.pluginSlug) &&
        !pendingRemovalSlugs.has(live.pluginSlug)
      ) {
        driftedPluginSlugs.push(live.pluginSlug);
      }
    }

    // Step 6 — Decide final state.
    //   - If `success` slugs went missing without a pending-removal pair →
    //     `drift` (regardless of descriptor diff).
    //   - Else fall back to descriptor diff (`healthy` vs `drift`).
    const descriptorChanged = !descriptorsEquivalent(
      marketplace.descriptor,
      descriptor,
    );
    const state: MarketplaceState =
      driftedPluginSlugs.length > 0 || descriptorChanged ? 'drift' : 'healthy';

    // Surface a pending "Packmind sync" PR (poll-on-refresh; cleaned on the
    // next reconcile once the PR is merged/closed). Best-effort: a lookup
    // failure must not flip the marketplace to unreachable.
    let pendingPrUrl: string | null = null;
    try {
      const openPr = await this.gitPort.findOpenSyncPullRequest(
        gitRepo,
        MARKETPLACE_SYNC_BRANCH,
      );
      pendingPrUrl = openPr?.url ?? null;
    } catch (error) {
      this.logger.warn(
        `[${this.origin}] Failed to look up sync PR for marketplace ${marketplace.id}`,
        { marketplaceId: marketplace.id, error: getErrorMessage(error) },
      );
      pendingPrUrl = marketplace.pendingPrUrl; // keep last known on lookup error
    }

    // Outdated detection: for the latest success distribution per package,
    // compare the package's CURRENT artifact-version fingerprint against the
    // fingerprint captured at publish. Distributions published before
    // fingerprints existed (versionFingerprint undefined) are skipped.
    const latestSuccessByPackage = new Map<
      string,
      (typeof successDistributions)[number]
    >();
    for (const dist of successDistributions) {
      // successDistributions is ordered by createdAt DESC, so first wins.
      if (!latestSuccessByPackage.has(dist.packageId)) {
        latestSuccessByPackage.set(dist.packageId, dist);
      }
    }

    const outdatedSet = new Set<string>();
    await Promise.all(
      Array.from(latestSuccessByPackage.values()).map(async (dist) => {
        if (!dist.versionFingerprint) {
          return; // cannot determine — never mark outdated
        }
        const pkg = await this.packageService.findById(dist.packageId);
        if (!pkg) {
          return;
        }
        const current = await this.versionFingerprintService.compute(pkg);
        if (!versionFingerprintsEqual(current, dist.versionFingerprint)) {
          outdatedSet.add(dist.pluginSlug);
        }
      }),
    );
    const outdatedPluginSlugs =
      outdatedSet.size > 0 ? Array.from(outdatedSet) : null;

    // Step 7 — Persist the update.
    if (state === 'drift') {
      const enrichedDescriptor: MarketplaceDescriptor = {
        ...descriptor,
        ...(driftedPluginSlugs.length > 0 ? { driftedPluginSlugs } : {}),
      };

      await this.marketplaceRepository.updateState(marketplace.id, {
        state,
        lastValidatedAt,
        descriptor: enrichedDescriptor,
        pluginCount: descriptor.plugins.length,
        errorKind: null,
        errorDetail: null,
        pendingPrUrl,
        outdatedPluginSlugs,
      });
      this.logger.info(
        `[${this.origin}] Marketplace ${marketplace.id} drifted — descriptor updated`,
        {
          marketplaceId: marketplace.id,
          previousPluginCount: marketplace.pluginCount,
          newPluginCount: descriptor.plugins.length,
          driftedPluginCount: driftedPluginSlugs.length,
        },
      );
    } else {
      await this.marketplaceRepository.updateState(marketplace.id, {
        state,
        lastValidatedAt,
        errorKind: null,
        errorDetail: null,
        pendingPrUrl,
        outdatedPluginSlugs,
      });
      this.logger.info(
        `[${this.origin}] Marketplace ${marketplace.id} is healthy`,
        { marketplaceId: marketplace.id },
      );
    }

    return {
      state,
      lastValidatedAt,
      errorKind: null,
      errorDetail: null,
      pendingPrUrl,
      outdatedPluginSlugs,
    };
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

const ERROR_DETAIL_AUTH_FAILED =
  'The marketplace credentials are invalid or expired. Reconnect the Git provider.';
const ERROR_DETAIL_NETWORK_TRANSIENT =
  'The marketplace repository is temporarily unreachable.';
const ERROR_DETAIL_REPO_NOT_FOUND =
  'The marketplace repository could not be found. It may have been deleted or renamed.';
const ERROR_DETAIL_BAD_FORMAT =
  'The marketplace descriptor is missing or unparseable.';

/**
 * Map a thrown git fetch error to a credential vs transient failure. Repo-gone
 * (404) is detected separately via a repo-existence probe, because a 404 on the
 * descriptor path is indistinguishable from a missing file at the throw site.
 */
function classifyFetchError(error: unknown): {
  errorKind: MarketplaceErrorKind;
  errorDetail: string;
} {
  const status = (error as { response?: { status?: number } })?.response
    ?.status;
  if (status === 401 || status === 403) {
    return {
      errorKind: 'auth_failed',
      errorDetail: ERROR_DETAIL_AUTH_FAILED,
    };
  }
  return {
    errorKind: 'network_transient',
    errorDetail: ERROR_DETAIL_NETWORK_TRANSIENT,
  };
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
