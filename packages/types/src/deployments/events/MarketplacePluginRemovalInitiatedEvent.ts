import { UserEvent } from '../../events';
import { MarketplaceDistributionId } from '../MarketplaceDistributionId';
import { MarketplaceId } from '../MarketplaceId';
import { PackageId } from '../Package';

/**
 * Trigger that caused the plugin removal flow to start.
 *
 * - `from_marketplace`: org admin clicked "Remove" on the marketplace details
 *   view (manual trigger, single distribution).
 * - `from_packmind_package`: cascade fired after a Packmind package was
 *   deleted, flipping every linked-marketplace distribution to
 *   `to_be_removed`.
 */
export type MarketplacePluginRemovalTrigger =
  | 'from_marketplace'
  | 'from_packmind_package';

/**
 * Payload emitted when a marketplace plugin removal is initiated (either
 * manually by an admin or via the package-delete cascade). `userId` and
 * `organizationId` are merged in via the `UserEvent` base.
 */
export interface MarketplacePluginRemovalInitiatedPayload {
  marketplaceId: MarketplaceId;
  distributionId: MarketplaceDistributionId;
  packageId: PackageId;
  packageSlug: string;
  pluginSlug: string;
  trigger: MarketplacePluginRemovalTrigger;
}

export class MarketplacePluginRemovalInitiatedEvent extends UserEvent<MarketplacePluginRemovalInitiatedPayload> {
  static override readonly eventName = 'deployments.distribution.retired';
}
