import { OrganizationId } from '../../accounts/Organization';
import { UserId } from '../../accounts/User';
import { MarketplaceDistributionId } from '../MarketplaceDistributionId';
import { MarketplaceId } from '../MarketplaceId';
import { PackageId } from '../../deployments/Package';

/**
 * Identifier of the BullMQ queue carrying marketplace plugin removal jobs.
 *
 * Like the publish queue, workers consuming this queue must run
 * single-concurrency to serialize Git operations against the rolling
 * `packmind/sync` PR.
 */
export const REMOVE_PLUGIN_FROM_MARKETPLACE_QUEUE =
  'remove-plugin-from-marketplace';

/**
 * Mirrors {@link PublishPluginToMarketplaceJobInput}: ids only, which the worker
 * re-loads so the Git deletion commit happens off the request thread.
 */
export interface RemovePluginFromMarketplaceJobInput {
  marketplaceDistributionId: MarketplaceDistributionId;
  marketplaceId: MarketplaceId;
  packageId: PackageId;
  organizationId: OrganizationId;
  userId: UserId;
}

/**
 * Void on purpose — fire-and-forget. The distribution stays in `to_be_removed`;
 * the terminal `removed` transition belongs to the reconciliation job, once the
 * deletion PR merges.
 */
export type RemovePluginFromMarketplaceJobOutput = void;
