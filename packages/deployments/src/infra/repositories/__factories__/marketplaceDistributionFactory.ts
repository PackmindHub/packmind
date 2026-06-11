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

/**
 * Chainable helper: builds a `to_be_removed` distribution.
 *
 * Used by repository specs, use-case specs and integration tests covering
 * the pending-removal lifecycle.
 */
export const toBeRemovedMarketplaceDistributionFactory: Factory<
  MarketplaceDistribution
> = (overrides?: Partial<MarketplaceDistribution>) =>
  marketplaceDistributionFactory({
    status: DistributionStatus.to_be_removed,
    ...overrides,
  });

/**
 * Chainable helper: builds a terminal `removed` distribution.
 *
 * Used by reconciliation-job specs covering the terminal transition once a
 * pending-removal slug has disappeared from the marketplace descriptor.
 */
export const removedMarketplaceDistributionFactory: Factory<
  MarketplaceDistribution
> = (overrides?: Partial<MarketplaceDistribution>) =>
  marketplaceDistributionFactory({
    status: DistributionStatus.removed,
    ...overrides,
  });
