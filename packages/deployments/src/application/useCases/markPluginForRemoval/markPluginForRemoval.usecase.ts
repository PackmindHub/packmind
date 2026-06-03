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
 * Marks a published marketplace plugin distribution as `to_be_removed`.
 *
 * Admin-only. Resolves the target distribution either directly by
 * `distributionId` or by `packageId` (latest `success`-state distribution for
 * the `(package, marketplace)` pair). Emits
 * `MarketplacePluginRemovalInitiatedEvent` with `trigger='from_marketplace'`
 * so the Amplitude listener and downstream consumers can observe the manual
 * trigger.
 *
 * Flow:
 *  1. Resolve the marketplace by `(organizationId, marketplaceId)`. Miss →
 *     `MarketplaceNotFoundError`.
 *  2. Resolve the target distribution. By `distributionId`: fetch by id +
 *     ensure it belongs to the marketplace. By `packageId`: call
 *     `findLatestSuccessfulByPackageAndMarketplace`. Miss →
 *     `PluginDistributionNotFoundError`.
 *  3. Validate the current status is `success`. Other state →
 *     `PluginDistributionInvalidStateError`.
 *  4. `updateStatus(id, { status: to_be_removed })`.
 *  5. Emit `MarketplacePluginRemovalInitiatedEvent` with
 *     `trigger='from_marketplace'`.
 *  6. Enqueue `RemovePluginFromMarketplaceDelayedJob` so the deletion is
 *     committed onto the rolling `packmind/sync` PR (symmetric to publish).
 *  7. Return the mutated distribution row.
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

    await this.marketplaceDistributionRepository.updateStatus(distribution.id, {
      status: DistributionStatus.to_be_removed,
    });

    const updated: MarketplaceDistribution = {
      ...distribution,
      status: DistributionStatus.to_be_removed,
    };

    const pkg = await this.packageService.findById(distribution.packageId);
    const packageSlug = pkg?.slug ?? '';

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
    // `packmind/sync` PR (symmetric to publish). The distribution stays
    // `to_be_removed`; the reconciliation job owns the terminal `removed`
    // transition once the PR merges. A failed enqueue must not fail the
    // request — reconciliation and a manual CLI deletion remain as fallbacks.
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

    this.logger.info('Marketplace plugin distribution marked for removal', {
      distributionId: distribution.id,
      marketplaceId,
      fromStatus: DistributionStatus.success,
      toStatus: DistributionStatus.to_be_removed,
    });

    return { distribution: updated };
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
