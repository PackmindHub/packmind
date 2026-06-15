import { OrganizationId } from '../../accounts/Organization';
import { UserId } from '../../accounts/User';
import { MarketplaceDistributionId } from '../MarketplaceDistributionId';
import { MarketplaceId } from '../MarketplaceId';
import { PackageId } from '../Package';

/**
 * Identifier of the BullMQ queue carrying marketplace plugin publish jobs.
 *
 * Workers consuming this queue must run single-concurrency to serialize Git
 * operations against the rolling `packmind/sync` PR.
 */
export const PUBLISH_PLUGIN_TO_MARKETPLACE_QUEUE =
  'publish-plugin-to-marketplace';

/**
 * Input payload for the marketplace plugin publish BullMQ job.
 *
 * The worker uses these ids to (re)load the distribution row, marketplace,
 * package, and acting user so all heavy lifting can happen off the request
 * thread.
 */
export interface PublishPluginToMarketplaceJobInput {
  marketplaceDistributionId: MarketplaceDistributionId;
  marketplaceId: MarketplaceId;
  packageId: PackageId;
  organizationId: OrganizationId;
  userId: UserId;
}

/**
 * Output payload — the job is fire-and-forget for the caller. The terminal
 * state is persisted on `MarketplaceDistribution.status`; the void output is
 * intentional.
 */
export type PublishPluginToMarketplaceJobOutput = void;
