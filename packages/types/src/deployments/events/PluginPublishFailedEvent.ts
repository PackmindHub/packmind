import { UserEvent } from '../../events';
import { MarketplaceDistributionId } from '../MarketplaceDistributionId';
import { MarketplaceId } from '../MarketplaceId';
import { PackageId } from '../Package';
import { PublishFailureReason } from '../PublishFailureReason';

/**
 * Emitted by the publish job when a marketplace publish attempt fails.
 *
 * `failureReason` is a stable, low-cardinality categorical value so analytics
 * dashboards and any downstream listener can branch on it without parsing
 * error messages. The raw error string remains stored on the
 * `MarketplaceDistribution` row for debugging.
 */
export interface PluginPublishFailedPayload {
  marketplaceDistributionId: MarketplaceDistributionId;
  marketplaceId: MarketplaceId;
  packageId: PackageId;
  failureReason: PublishFailureReason;
}

export class PluginPublishFailedEvent extends UserEvent<PluginPublishFailedPayload> {
  static override readonly eventName = 'deployments.plugin.publish-failed';
}
