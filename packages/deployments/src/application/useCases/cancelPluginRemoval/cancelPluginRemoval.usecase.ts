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
 * distribution from `to_be_removed` back to `success`.
 *
 * Admin-only. No domain event is emitted (per AC5 — cancellations are not
 * tracked in v1).
 *
 * Flow:
 *  1. Resolve the marketplace by `(organizationId, marketplaceId)`. Miss →
 *     `MarketplaceNotFoundError`.
 *  2. Fetch the distribution by id and ensure it belongs to the marketplace.
 *     Miss → `PluginDistributionNotFoundError`.
 *  3. Validate the current status is `to_be_removed`. Other state →
 *     `PluginDistributionInvalidStateError`.
 *  4. `updateStatus(id, { status: success })`.
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

    if (distribution.status !== DistributionStatus.to_be_removed) {
      this.logger.warn(
        'Cannot cancel plugin removal — distribution not in to_be_removed state',
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

    await this.marketplaceDistributionRepository.updateStatus(distribution.id, {
      status: DistributionStatus.success,
    });

    const updated: MarketplaceDistribution = {
      ...distribution,
      status: DistributionStatus.success,
    };

    this.logger.info(
      'Marketplace plugin distribution removal cancelled — reverted to success',
      {
        distributionId: distribution.id,
        marketplaceId,
        fromStatus: DistributionStatus.to_be_removed,
        toStatus: DistributionStatus.success,
      },
    );

    return { distribution: updated };
  }
}
