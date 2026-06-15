import { DistributionStatus } from '../DistributionStatus';
import { MarketplaceDistributionId } from '../MarketplaceDistributionId';

/**
 * Error thrown when an attempted state transition on a `MarketplaceDistribution`
 * is rejected because the current status is not one of the allowed source
 * statuses for that transition (e.g. marking a distribution for removal when it
 * is not in `success`/`pending_merge`).
 */
export class PluginDistributionInvalidStateError extends Error {
  constructor(
    public readonly distributionId: MarketplaceDistributionId,
    public readonly from: DistributionStatus,
    public readonly expected: DistributionStatus[],
  ) {
    super(
      `Marketplace plugin distribution "${distributionId}" is in status "${from}" but the operation requires one of [${expected.join(', ')}]`,
    );
    this.name = 'PluginDistributionInvalidStateError';
  }
}
