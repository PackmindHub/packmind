import { PackmindLogger } from '@packmind/logger';
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';
import {
  CancelPluginRemovalCommand,
  CancelPluginRemovalResponse,
  DistributionStatus,
  IAccountsPort,
  ICancelPluginRemovalUseCase,
  MarketplaceDistribution,
  MarketplaceNotFoundError,
  PluginDistributionInvalidStateError,
  PluginDistributionNotFoundError,
} from '@packmind/types';
import { IMarketplaceDistributionRepository } from '../../../domain/repositories/IMarketplaceDistributionRepository';
import { IMarketplaceRepository } from '../../../domain/repositories/IMarketplaceRepository';

const origin = 'CancelPluginRemovalUseCase';

/**
 * Cancels a previously initiated plugin removal, reverting the target
 * distribution to `success` and clearing the `removalRequestedAt` marker.
 *
 * Admin-only. No domain event is emitted (per AC5 — cancellations are not
 * tracked in v1).
 *
 * A removal is cancellable in two states: while the request is still pending
 * (`removalRequestedAt` set, status still `success` because the deletion has
 * not yet landed on the sync branch) and after the job has flipped it to
 * `to_be_removed`. Clearing the marker in the pending window also signals the
 * `RemovePluginFromMarketplaceDelayedJob` to abort before committing.
 *
 * Flow:
 *  1. Resolve the marketplace by `(organizationId, marketplaceId)`. Miss →
 *     `MarketplaceNotFoundError`.
 *  2. Fetch the distribution by id and ensure it belongs to the marketplace.
 *     Miss → `PluginDistributionNotFoundError`.
 *  3. Validate a removal is actually pending — status `to_be_removed` OR
 *     `removalRequestedAt` set. Otherwise → `PluginDistributionInvalidStateError`.
 *  4. Revert the status to `success` (only when it was `to_be_removed`) and
 *     clear `removalRequestedAt`.
 *  5. Return the mutated row.
 */
export class CancelPluginRemovalUseCase
  extends AbstractAdminUseCase<
    CancelPluginRemovalCommand,
    CancelPluginRemovalResponse
  >
  implements ICancelPluginRemovalUseCase
{
  constructor(
    private readonly marketplaceRepository: IMarketplaceRepository,
    private readonly marketplaceDistributionRepository: IMarketplaceDistributionRepository,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForAdmins(
    command: CancelPluginRemovalCommand & AdminContext,
  ): Promise<CancelPluginRemovalResponse> {
    const { marketplaceId, distributionId, organization } = command;

    this.logger.info('Cancelling marketplace plugin distribution removal', {
      marketplaceId,
      distributionId,
      organizationId: organization.id,
    });

    const marketplace =
      await this.marketplaceRepository.findByOrganizationAndId(
        organization.id,
        marketplaceId,
      );
    if (!marketplace) {
      this.logger.warn('Marketplace not found for cancel-removal', {
        marketplaceId,
        organizationId: organization.id,
      });
      throw new MarketplaceNotFoundError(marketplaceId);
    }

    const distribution =
      await this.marketplaceDistributionRepository.findById(distributionId);
    if (!distribution || distribution.marketplaceId !== marketplaceId) {
      this.logger.warn(
        'Marketplace plugin distribution not found for cancel-removal',
        { distributionId, marketplaceId },
      );
      throw new PluginDistributionNotFoundError({ distributionId });
    }

    const isPendingRemoval =
      distribution.status === DistributionStatus.to_be_removed ||
      !!distribution.removalRequestedAt;
    if (!isPendingRemoval) {
      this.logger.warn(
        'Cannot cancel plugin removal — no removal pending for distribution',
        {
          distributionId,
          currentStatus: distribution.status,
        },
      );
      throw new PluginDistributionInvalidStateError(
        distribution.id,
        distribution.status,
        [DistributionStatus.to_be_removed],
      );
    }

    // Revert the status only when the job already flipped it to
    // `to_be_removed`. In the pending window the status is still `success`, so
    // clearing the marker alone is enough (and avoids a redundant write).
    if (distribution.status === DistributionStatus.to_be_removed) {
      await this.marketplaceDistributionRepository.updateStatus(
        distribution.id,
        { status: DistributionStatus.success },
      );
    }
    await this.marketplaceDistributionRepository.updateRemovalRequestedAt(
      distribution.id,
      null,
    );

    const updated: MarketplaceDistribution = {
      ...distribution,
      status: DistributionStatus.success,
      removalRequestedAt: null,
    };

    this.logger.info(
      'Marketplace plugin distribution removal cancelled — reverted to success',
      {
        distributionId: distribution.id,
        marketplaceId,
        fromStatus: distribution.status,
        toStatus: DistributionStatus.success,
      },
    );

    return { distribution: updated };
  }
}
