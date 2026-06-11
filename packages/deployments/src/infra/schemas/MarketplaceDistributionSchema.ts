import { EntitySchema } from 'typeorm';
import {
  MarketplaceDistribution,
  Marketplace,
  Organization,
  Package,
  User,
} from '@packmind/types';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/node-utils';

/**
 * TypeORM schema for the `marketplace_distributions` table.
 *
 * Each row records a single attempt to publish a Packmind package as a
 * managed plugin on a linked marketplace. Mirrors the code-repository
 * `Distribution` schema so the frontend can surface progress, success,
 * no-op, and failure to the user through the same conceptual model.
 *
 * Soft-delete-aware: rows survive package/marketplace removal for audit.
 */
export const MarketplaceDistributionSchema = new EntitySchema<
  WithSoftDelete<
    WithTimestamps<
      MarketplaceDistribution & {
        organization?: Organization;
        marketplace?: Marketplace;
        packageRef?: Package;
        author?: User;
      }
    >
  >
>({
  name: 'MarketplaceDistribution',
  tableName: 'marketplace_distributions',
  columns: {
    organizationId: {
      name: 'organization_id',
      type: 'uuid',
      nullable: false,
    },
    marketplaceId: {
      name: 'marketplace_id',
      type: 'uuid',
      nullable: false,
    },
    packageId: {
      name: 'package_id',
      type: 'uuid',
      nullable: false,
    },
    pluginSlug: {
      name: 'plugin_slug',
      type: 'varchar',
      nullable: false,
    },
    authorId: {
      name: 'author_id',
      type: 'uuid',
      nullable: false,
    },
    status: {
      type: 'varchar',
      nullable: false,
    },
    source: {
      type: 'varchar',
      nullable: false,
      default: 'app',
    },
    prUrl: {
      name: 'pr_url',
      type: 'text',
      nullable: true,
    },
    gitCommit: {
      name: 'git_commit',
      type: 'varchar',
      nullable: true,
    },
    error: {
      type: 'text',
      nullable: true,
    },
    failureReason: {
      name: 'failure_reason',
      type: 'varchar',
      nullable: true,
    },
    contentHash: {
      name: 'content_hash',
      type: 'varchar',
      nullable: true,
    },
    versionFingerprint: {
      name: 'version_fingerprint',
      type: 'jsonb',
      nullable: true,
    },
    publishConfirmedAt: {
      name: 'publish_confirmed_at',
      type: 'timestamp with time zone',
      nullable: true,
    },
    removalRequestedAt: {
      name: 'removal_requested_at',
      type: 'timestamp with time zone',
      nullable: true,
    },
    ...uuidSchema,
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
  relations: {
    organization: {
      type: 'many-to-one',
      target: 'Organization',
      joinColumn: {
        name: 'organization_id',
      },
      onDelete: 'CASCADE',
    },
    marketplace: {
      type: 'many-to-one',
      target: 'Marketplace',
      joinColumn: {
        name: 'marketplace_id',
      },
      onDelete: 'CASCADE',
    },
    packageRef: {
      type: 'many-to-one',
      target: 'Package',
      joinColumn: {
        name: 'package_id',
      },
      onDelete: 'CASCADE',
    },
    author: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: {
        name: 'author_id',
      },
      onDelete: 'RESTRICT',
    },
  },
  indices: [
    {
      name: 'idx_marketplace_distributions_marketplace_id',
      columns: ['marketplaceId'],
    },
    {
      name: 'idx_marketplace_distributions_package_marketplace',
      columns: ['packageId', 'marketplaceId'],
    },
    {
      name: 'idx_marketplace_distributions_status',
      columns: ['status'],
    },
  ],
});
