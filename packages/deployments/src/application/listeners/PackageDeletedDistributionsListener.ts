import { PackmindLogger } from '@packmind/logger';
import { PackmindListener } from '@packmind/node-utils';
import {
  DistributionStatus,
  MarketplacePluginRemovalInitiatedEvent,
  PackagesDeletedEvent,
  PackageId,
} from '@packmind/types';
import { IMarketplaceDistributionRepository } from '../../domain/repositories/IMarketplaceDistributionRepository';
import { PackageService } from '../services/PackageService';
import { RemovePluginFromMarketplaceDelayedJob } from '../jobs/RemovePluginFromMarketplaceDelayedJob';

const origin = 'PackageDeletedDistributionsListener';

/**
 * Aggregates the dependencies needed to flip live marketplace distributions
 * to `to_be_removed` when a Packmind package is deleted.
 */
export type PackageDeletedDistributionsAdapter = {
  marketplaceDistributionRepository: IMarketplaceDistributionRepository;
  packageService: PackageService;
  removePluginFromMarketplaceJob: RemovePluginFromMarketplaceDelayedJob;
};

/**
 * Cascades a Packmind package deletion to every linked-marketplace
 * distribution of that package:
 *
 *  - Subscribes to `PackagesDeletedEvent` (emitted by
 *    `DeletePackagesBatchUseCase`).
 *  - For each deleted package, looks up every `success`-state distribution
 *    via `findActiveByPackageId` (the `success` filter skips already
 *    `to_be_removed` rows so the listener is idempotent on retries).
 *  - Transitions each one to `to_be_removed`, emits
 *    `MarketplacePluginRemovalInitiatedEvent` with
 *    `trigger='from_packmind_package'`, and enqueues
 *    `RemovePluginFromMarketplaceDelayedJob` so the deletion is committed onto
 *    the rolling `packmind/sync` PR (symmetric to the manual removal flow).
 */
export class PackageDeletedDistributionsListener extends PackmindListener<PackageDeletedDistributionsAdapter> {
  constructor(
    adapter: PackageDeletedDistributionsAdapter,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(adapter);
  }

  protected registerHandlers(): void {
    this.subscribe(PackagesDeletedEvent, this.handlePackagesDeleted);
  }

  private handlePackagesDeleted = async (
    event: PackagesDeletedEvent,
  ): Promise<void> => {
    const { packageIds, userId, organizationId, source } = event.payload;
    this.logger.info('Handling PackagesDeletedEvent', {
      packageCount: packageIds.length,
      organizationId,
    });

    for (const packageId of packageIds) {
      try {
        await this.cascadePackageDeletion(
          packageId,
          userId,
          organizationId,
          source,
        );
      } catch (error) {
        this.logger.error(
          'Failed to cascade package deletion to marketplace distributions',
          {
            packageId,
            error: error instanceof Error ? error.message : String(error),
          },
        );
        // Re-throw so the error surfaces in tests/observability.
        throw error;
      }
    }
  };

  private async cascadePackageDeletion(
    packageId: PackageId,
    userId: PackagesDeletedEvent['payload']['userId'],
    organizationId: PackagesDeletedEvent['payload']['organizationId'],
    source: PackagesDeletedEvent['payload']['source'],
  ): Promise<void> {
    const liveDistributions =
      await this.adapter.marketplaceDistributionRepository.findActiveByPackageId(
        packageId,
      );

    if (liveDistributions.length === 0) {
      this.logger.info(
        'No live marketplace distributions for deleted package',
        {
          packageId,
        },
      );
      return;
    }

    // Best-effort: resolve the package slug once for the event payload. The
    // package is already deleted in this code path, so an empty slug is the
    // graceful fallback (the event consumer can still correlate via id).
    const pkg = await this.adapter.packageService.findById(packageId);
    const packageSlug = pkg?.slug ?? '';

    for (const distribution of liveDistributions) {
      // Defensive: findActiveByPackageId already filters on success, but the
      // contract is explicit so we double-check.
      if (distribution.status !== DistributionStatus.success) {
        continue;
      }

      await this.adapter.marketplaceDistributionRepository.updateStatus(
        distribution.id,
        { status: DistributionStatus.to_be_removed },
      );

      this.eventEmitterService.emit(
        new MarketplacePluginRemovalInitiatedEvent({
          userId,
          organizationId,
          source,
          marketplaceId: distribution.marketplaceId,
          distributionId: distribution.id,
          packageId: distribution.packageId,
          packageSlug,
          pluginSlug: distribution.pluginSlug,
          trigger: 'from_packmind_package',
        }),
      );

      // Enqueue the Git side effect (commit the deletion to `packmind/sync`).
      // Best-effort: a failed enqueue must not abort the cascade — the
      // distribution stays `to_be_removed` for reconciliation/manual fallback.
      try {
        await this.adapter.removePluginFromMarketplaceJob.addJob({
          marketplaceDistributionId: distribution.id,
          marketplaceId: distribution.marketplaceId,
          packageId: distribution.packageId,
          organizationId,
          userId,
        });
      } catch (error) {
        this.logger.error(
          'Failed to enqueue marketplace plugin removal job during cascade',
          {
            distributionId: distribution.id,
            marketplaceId: distribution.marketplaceId,
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }

      this.logger.info(
        'Marketplace plugin distribution cascaded to to_be_removed',
        {
          distributionId: distribution.id,
          marketplaceId: distribution.marketplaceId,
          fromStatus: DistributionStatus.success,
          toStatus: DistributionStatus.to_be_removed,
        },
      );
    }
  }
}
