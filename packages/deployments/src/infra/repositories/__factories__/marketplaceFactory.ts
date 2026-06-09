import { Factory } from '@packmind/test-utils';
import {
  Marketplace,
  MarketplaceDescriptor,
  createGitRepoId,
  createMarketplaceId,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

const defaultDescriptor = (): MarketplaceDescriptor => ({
  vendor: 'anthropic',
  name: 'test-marketplace',
  version: '1.0.0',
  plugins: [
    { slug: 'plugin-one', name: 'Plugin One', version: '1.0.0' },
    { slug: 'plugin-two', name: 'Plugin Two' },
  ],
  raw: {
    name: 'test-marketplace',
    version: '1.0.0',
    plugins: [
      { slug: 'plugin-one', name: 'Plugin One', version: '1.0.0' },
      { slug: 'plugin-two', name: 'Plugin Two' },
    ],
  },
});

/**
 * Factory for building `Marketplace` rows in tests.
 *
 * Provides sensible defaults so most callers can override only the
 * specific field they care about (e.g. `organizationId`, `gitRepoId`).
 * Timestamps and soft-delete columns are intentionally omitted — TypeORM
 * populates `created_at` / `updated_at` via column defaults, and
 * `deleted_at` / `deleted_by` stay `null` until an explicit soft-delete.
 */
export const marketplaceFactory: Factory<Marketplace> = (
  overrides?: Partial<Marketplace>,
) => {
  const descriptor = overrides?.descriptor ?? defaultDescriptor();
  return {
    id: createMarketplaceId(uuidv4()),
    organizationId: createOrganizationId(uuidv4()),
    gitRepoId: createGitRepoId(uuidv4()),
    name: 'Test Marketplace',
    vendor: 'anthropic',
    addedBy: createUserId(uuidv4()),
    linkedAt: new Date('2026-01-01T00:00:00.000Z'),
    state: 'healthy',
    lastValidatedAt: null,
    descriptor,
    pluginCount: descriptor.plugins.length,
    ...overrides,
  } as Marketplace;
};
