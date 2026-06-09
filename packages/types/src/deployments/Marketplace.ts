import { OrganizationId } from '../accounts/Organization';
import { UserId } from '../accounts/User';
import { GitRepoId } from '../git/GitRepoId';
import { WithSoftDelete, WithTimestamps } from '../database/types';
import { MarketplaceDescriptor } from './MarketplaceDescriptor';
import { MarketplaceErrorKind } from './MarketplaceErrorKind';
import { MarketplaceId } from './MarketplaceId';
import { MarketplaceState } from './MarketplaceState';
import { MarketplaceVendor } from './MarketplaceVendor';

/**
 * A marketplace linked at the organization level.
 *
 * Owns a reference to a `GitRepo` (with `type='marketplace'`) used to fetch
 * the marketplace descriptor. The descriptor and `pluginCount` are
 * denormalized onto the row to make the list endpoint fast; the
 * reconciliation background job keeps them fresh.
 */
export type Marketplace = WithSoftDelete<
  WithTimestamps<{
    id: MarketplaceId;
    organizationId: OrganizationId;
    gitRepoId: GitRepoId;
    name: string;
    vendor: MarketplaceVendor;
    addedBy: UserId;
    linkedAt: Date;
    state: MarketplaceState;
    lastValidatedAt: Date | null;
    descriptor: MarketplaceDescriptor;
    pluginCount: number;
    /** Sub-classification of an `unreachable` state; `null` otherwise. */
    errorKind: MarketplaceErrorKind | null;
    /** Short, PII-safe, user-facing explanation of the last failure; `null` when healthy. */
    errorDetail: string | null;
    /** URL of the open "Packmind sync" PR on the marketplace repo, or `null` when none is open. */
    pendingPrUrl: string | null;
    /** Slugs whose served plugin is built from a package that has changed since last publish. */
    outdatedPluginSlugs: string[] | null;
  }>
>;
