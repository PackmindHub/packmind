import { OrganizationId } from '../accounts/Organization';
import { UserId } from '../accounts/User';
import { GitRepoId } from '../git/GitRepoId';
import { WithSoftDelete, WithTimestamps } from '../database/types';
import { MarketplaceDescriptor } from './MarketplaceDescriptor';
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
  }>
>;
