import { UserEvent } from '../../events';
import { MarketplaceDistributionId } from '../MarketplaceDistributionId';
import { MarketplaceId } from '../MarketplaceId';
import { PackageId } from '../Package';

/**
 * Emitted by the publish job after a successful publish (or a no-op short
 * circuit). `wasNoop=true` indicates the publish converged without a new git
 * commit — either via the content-hash idempotency check or via the git
 * provider's `NO_CHANGES_DETECTED` signal.
 */
export interface PluginPublishedPayload {
  marketplaceDistributionId: MarketplaceDistributionId;
  marketplaceId: MarketplaceId;
  packageId: PackageId;
  prUrl?: string;
  wasNoop: boolean;
  commitCountAfter?: number;
}

export class PluginPublishedEvent extends UserEvent<PluginPublishedPayload> {
  static override readonly eventName = 'deployments.plugin.published';
}
