import { PackmindLogger } from '@packmind/logger';
import {
  AbstractAdminUseCase,
  AdminContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  createUserId,
  DistributionStatus,
  IAccountsPort,
  IMarkPluginForRemovalUseCase,
  MarkPluginForRemovalCommand,
  MarkPluginForRemovalResponse,
  MarketplaceDistribution,
  MarketplaceNotFoundError,
  MarketplacePluginRemovalInitiatedEvent,
  PluginDistributionInvalidStateError,
  PluginDistributionNotFoundError,
} from '@packmind/types';
import { IMarketplaceDistributionRepository } from '../../../domain/repositories/IMarketplaceDistributionRepository';
import { IMarketplaceRepository } from '../../../domain/repositories/IMarketplaceRepository';
import { PackageService } from '../../services/PackageService';
import { RemovePluginFromMarketplaceDelayedJob } from '../../jobs/RemovePluginFromMarketplaceDelayedJob';

const origin = 'MarkPluginForRemovalUseCase';

/**
 * Requests removal of a published marketplace plugin distribution.
 *
 * Admin-only. Resolves the target distribution either directly by
 * `distributionId` or by `packageId` (latest `success`-state distribution for
 * the `(package, marketplace)` pair). Emits
 * `MarketplacePluginRemovalInitiatedEvent` with `trigger='from_marketplace'`
 * so the Amplitude listener and downstream consumers can observe the manual
 * trigger.
 *
 * The status is intentionally left at `success` here. The
 * `RemovePluginFromMarketplaceDelayedJob` flips it to `to_be_removed` only once
 * the deletion lands on the rolling `packmind/sync` branch, so the status
 * tracks the sync branch rather than the bare request. The reconciliation job
 * owns the terminal `removed` transition once the deletion PR merges.
 *
 * Because the status stays `success` during that window, the request itself is
 * recorded out-of-band via `removalRequestedAt`: it is stamped synchronously so
 * the UI can surface a "removal pending" state immediately, and a repeated
 * request becomes a no-op rather than a duplicate event/job (or a confusing
 * `success`-already-flipped error).
 *
 * Flow:
 *  1. Resolve the marketplace by `(organizationId, marketplaceId)`. Miss →
 *     `MarketplaceNotFoundError`.
 *  2. Resolve the target distribution. By `distributionId`: fetch by id +
 *     ensure it belongs to the marketplace. By `packageId`: call
 *     `findLatestSuccessfulByPackageAndMarketplace`. Miss →
 *     `PluginDistributionNotFoundError`.
 *  3. If `removalRequestedAt` is already set, return the row unchanged
 *     (idempotent — no duplicate event/job). Placed before the status guard so
 *     a row the job has already flipped to `to_be_removed` re-resolves here
 *     instead of erroring.
 *  4. Validate the current status is `success`. Other state →
 *     `PluginDistributionInvalidStateError`.
 *  5. Stamp `removalRequestedAt = now` so the request is observable before the
 *     async job runs.
 *  6. Emit `MarketplacePluginRemovalInitiatedEvent` with
 *     `trigger='from_marketplace'`.
 *  7. Enqueue `RemovePluginFromMarketplaceDelayedJob` so the deletion is
 *     committed onto the rolling `packmind/sync` PR (symmetric to publish); the
 *     job flips the status to `to_be_removed` once the commit lands.
 *  8. Return the distribution row (still `success`, now carrying
 *     `removalRequestedAt`).
 */
export class MarkPluginForRemovalUseCase
  extends AbstractAdminUseCase<
    MarkPluginForRemovalCommand,
    MarkPluginForRemovalResponse
  >
  implements IMarkPluginForRemovalUseCase
{
  constructor(
    private readonly marketplaceRepository: IMarketplaceRepository,
    private readonly marketplaceDistributionRepository: IMarketplaceDistributionRepository,
    private readonly packageService: PackageService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly removalJob: RemovePluginFromMarketplaceDelayedJob,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForAdmins(
    command: MarkPluginForRemovalCommand & AdminContext,
  ): Promise<MarkPluginForRemovalResponse> {
    const { marketplaceId, organization, userId } = command;

    // Mask UUIDs in user-facing logs per
    // standard-compliance-logging-personal-information.md.
    this.logger.info('Marking marketplace plugin distribution for removal', {
      marketplaceId,
      organizationId: organization.id,
      hasDistributionId:
        'distributionId' in command && !!command.distributionId,
      hasPackageId: 'packageId' in command && !!command.packageId,
    });

    const marketplace =
      await this.marketplaceRepository.findByOrganizationAndId(
        organization.id,
        marketplaceId,
      );
    if (!marketplace) {
      this.logger.warn('Marketplace not found for plugin removal', {
        marketplaceId,
        organizationId: organization.id,
      });
      throw new MarketplaceNotFoundError(marketplaceId);
    }

    const distribution = await this.resolveDistribution(command);
    if (!distribution) {
      throw 'distributionId' in command && command.distributionId
        ? new PluginDistributionNotFoundError({
            distributionId: command.distributionId,
          })
        : new PluginDistributionNotFoundError({
            packageId: (command as { packageId: string }).packageId,
            marketplaceId,
          });
    }

    if (distribution.marketplaceId !== marketplaceId) {
      this.logger.warn(
        'Marketplace plugin distribution does not belong to the requested marketplace',
        {
          distributionId: distribution.id,
          requestedMarketplaceId: marketplaceId,
          actualMarketplaceId: distribution.marketplaceId,
        },
      );
      throw new PluginDistributionNotFoundError({
        distributionId: distribution.id,
      });
    }

    // Idempotent: a removal already requested (marker set) must not enqueue a
    // second job or emit a duplicate event. Return the row as-is so the caller
    // (and the UI) still observe the pending state. Placed before the status
    // guard so a row the job has already flipped to `to_be_removed` resolves
    // here rather than tripping the `success`-only guard below.
    if (distribution.removalRequestedAt) {
      this.logger.info(
        'Marketplace plugin distribution already has a pending removal request — returning idempotently',
        {
          distributionId: distribution.id,
          marketplaceId,
        },
      );
      return { distribution };
    }

    if (distribution.status !== DistributionStatus.success) {
      this.logger.warn(
        'Cannot mark distribution for removal — invalid current status',
        {
          distributionId: distribution.id,
          status: distribution.status,
        },
      );
      throw new PluginDistributionInvalidStateError(
        distribution.id,
        distribution.status,
        [DistributionStatus.success],
      );
    }

    const pkg = await this.packageService.findById(distribution.packageId);
    const packageSlug = pkg?.slug ?? '';

    // Stamp the request synchronously while the status stays `success`. This is
    // the signal the UI keys off to switch the row to a "removal pending" state
    // and the guard above keys off to stay idempotent. Persisted before the
    // event/job so a write failure aborts the request instead of leaving a
    // dangling event with no recorded request.
    const requestedAt = new Date();
    await this.marketplaceDistributionRepository.updateRemovalRequestedAt(
      distribution.id,
      requestedAt,
    );

    this.eventEmitterService.emit(
      new MarketplacePluginRemovalInitiatedEvent({
        userId: createUserId(userId),
        organizationId: organization.id,
        source: command.source ?? 'ui',
        marketplaceId,
        distributionId: distribution.id,
        packageId: distribution.packageId,
        packageSlug,
        pluginSlug: distribution.pluginSlug,
        trigger: 'from_marketplace',
      }),
    );

    // Enqueue the Git side effect: commit the plugin deletion onto the rolling
    // `packmind/sync` PR (symmetric to publish). The status stays `success`
    // here on purpose — the job flips it to `to_be_removed` only once the
    // deletion lands on the sync branch, and the reconciliation job owns the
    // terminal `removed` transition once the PR merges. A failed enqueue must
    // not fail the request — reconciliation and a manual CLI deletion remain as
    // fallbacks.
    try {
      await this.removalJob.addJob({
        marketplaceDistributionId: distribution.id,
        marketplaceId,
        packageId: distribution.packageId,
        organizationId: organization.id,
        userId: createUserId(userId),
      });
    } catch (error) {
      this.logger.error(
        'Failed to enqueue marketplace plugin removal job; distribution stays to_be_removed',
        {
          distributionId: distribution.id,
          marketplaceId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }

    this.logger.info('Marketplace plugin removal requested', {
      distributionId: distribution.id,
      marketplaceId,
      status: distribution.status,
    });

    return {
      distribution: { ...distribution, removalRequestedAt: requestedAt },
    };
  }

  private async resolveDistribution(
    command: MarkPluginForRemovalCommand,
  ): Promise<MarketplaceDistribution | null> {
    if ('distributionId' in command && command.distributionId) {
      return this.marketplaceDistributionRepository.findById(
        command.distributionId,
      );
    }
    if ('packageId' in command && command.packageId) {
      return this.marketplaceDistributionRepository.findLatestSuccessfulByPackageAndMarketplace(
        command.packageId,
        command.marketplaceId,
      );
    }
    return null;
  }
}
