import { UserEvent } from '../../events';
import { MarketplaceDistributionId } from '../MarketplaceDistributionId';
import { MarketplaceId } from '../MarketplaceId';
import { PackageId } from '../Package';

/**
 * Emitted as soon as a publish attempt is enqueued — before the BullMQ job
 * runs. Used by the analytics listener to fire `plugin_publish_attempted` and
 * by any subscriber that needs to track in-flight publishes.
 *
 * `isFirstPublishForPackage` reflects whether the (package, marketplace)
 * pair already had any prior distribution row — useful to disambiguate the
 * "create" vs "refresh" funnels in analytics.
 */
export interface PluginPublishAttemptedPayload {
  marketplaceDistributionId: MarketplaceDistributionId;
  marketplaceId: MarketplaceId;
  packageId: PackageId;
  isFirstPublishForPackage: boolean;
}

export class PluginPublishAttemptedEvent extends UserEvent<PluginPublishAttemptedPayload> {
  static override readonly eventName = 'deployments.plugin.publish-attempted';
}
