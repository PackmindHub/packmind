import { Factory } from '@packmind/test-utils';
import {
  DistributionStatus,
  MarketplaceDistribution,
  createMarketplaceDistributionId,
  createMarketplaceId,
  createOrganizationId,
  createPackageId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Factory for building `MarketplaceDistribution` rows in tests.
 *
 * Defaults match a freshly-enqueued `in_progress` row created by the
 * publish use case — overridable per test. Timestamps and soft-delete
 * columns are intentionally omitted: TypeORM populates `created_at` /
 * `updated_at` via column defaults, and `deleted_at` / `deleted_by` stay
 * `null` until an explicit soft-delete.
 */
export const marketplaceDistributionFactory: Factory<
  MarketplaceDistribution
> = (overrides?: Partial<MarketplaceDistribution>) => {
  return {
    id: createMarketplaceDistributionId(uuidv4()),
    organizationId: createOrganizationId(uuidv4()),
    marketplaceId: createMarketplaceId(uuidv4()),
    packageId: createPackageId(uuidv4()),
    pluginSlug: 'sample-plugin',
    authorId: createUserId(uuidv4()),
    status: DistributionStatus.in_progress,
    source: 'app',
    ...overrides,
  } as MarketplaceDistribution;
};
