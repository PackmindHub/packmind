import { MarketplaceDistributionStatus } from '../MarketplaceDistributionStatus';
import { MarketplaceDistributionId } from '../MarketplaceDistributionId';
import { MarketplacesError } from './MarketplacesError';

/**
 * Error thrown when an attempted state transition on a `MarketplaceDistribution`
 * is rejected because the current status is not one of the allowed source
 * statuses for that transition (e.g. marking a distribution for removal when it
 * is not in `success`/`pending_merge`).
 */
export class PluginDistributionInvalidStateError extends MarketplacesError {
  constructor(
    public readonly distributionId: MarketplaceDistributionId,
    public readonly from: MarketplaceDistributionStatus,
    public readonly expected: MarketplaceDistributionStatus[],
  ) {
    super(
      'conflict',
      'plugin_distribution_invalid_state',
      {
        distributionId,
        distributionStatus: from,
        expectedDistributionStatuses: expected,
      },
      `The plugin distribution is in status "${from}" but the operation requires one of [${expected.join(', ')}]`,
    );
    this.name = 'PluginDistributionInvalidStateError';
  }
}
