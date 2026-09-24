import { OrganizationId } from '../../accounts/Organization';
import { UserId } from '../../accounts/User';
import { MarketplaceDistributionId } from '../MarketplaceDistributionId';
import { MarketplaceId } from '../MarketplaceId';
import { PackageId } from '../../deployments/Package';
import { PublishFailureReason } from '../../deployments/PublishFailureReason';

/**
 * Identifier of the BullMQ queue carrying marketplace plugin publish jobs.
 *
 * Workers consuming this queue must run single-concurrency to serialize Git
 * operations against the rolling `packmind/sync` PR.
 */
export const PUBLISH_PLUGIN_TO_MARKETPLACE_QUEUE =
  'publish-plugin-to-marketplace';

/**
 * Ids only, which the worker re-loads so all the heavy lifting happens off the
 * request thread — plus the package version the publish pinned, when package
 * releases are enabled; without it the live package content is published.
 */
export interface PublishPluginToMarketplaceJobInput {
  marketplaceDistributionId: MarketplaceDistributionId;
  marketplaceId: MarketplaceId;
  packageId: PackageId;
  organizationId: OrganizationId;
  userId: UserId;
  packageVersion?: string;
}

/**
 * Fire-and-forget for the caller: the terminal state is persisted on
 * `MarketplaceDistribution.status` regardless. This output exists so the BullMQ
 * `completed` listener can pick the right log level — a swallowed failure must
 * not be narrated as "completed".
 */
export interface PublishPluginToMarketplaceJobOutput {
  marketplaceDistributionId: MarketplaceDistributionId;
  status: 'success' | 'no_changes' | 'failure';
  failureReason?: PublishFailureReason;
}
