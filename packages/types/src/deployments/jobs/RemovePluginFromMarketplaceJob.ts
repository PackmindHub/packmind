import { OrganizationId } from '../../accounts/Organization';
import { UserId } from '../../accounts/User';
import { MarketplaceDistributionId } from '../MarketplaceDistributionId';
import { MarketplaceId } from '../MarketplaceId';
import { PackageId } from '../Package';

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
 * Input payload for the marketplace plugin removal BullMQ job.
 *
 * Mirrors {@link PublishPluginToMarketplaceJobInput}: the worker uses these
 * ids to (re)load the distribution row, marketplace, package, and acting user
 * so the Git deletion commit happens off the request thread.
 */
export interface RemovePluginFromMarketplaceJobInput {
  marketplaceDistributionId: MarketplaceDistributionId;
  marketplaceId: MarketplaceId;
  packageId: PackageId;
  organizationId: OrganizationId;
  userId: UserId;
}

/**
 * Output payload — the job is fire-and-forget for the caller. The distribution
 * stays in `to_be_removed`; the terminal `removed` transition is owned by the
 * reconciliation job once the deletion PR merges. The void output is
 * intentional.
 */
export type RemovePluginFromMarketplaceJobOutput = void;
