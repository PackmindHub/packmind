import { EntitySchema } from 'typeorm';
import { GitRepo, Marketplace, Organization, User } from '@packmind/types';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/node-utils';

/**
 * TypeORM schema for the `marketplaces` table.
 *
 * Each row binds an organization to a `GitRepo` (with `type='marketplace'`)
 * that hosts a marketplace descriptor (e.g. `marketplace.json`). The parsed
 * descriptor and its `pluginCount` are denormalized on the row so the list
 * endpoint stays fast; the reconciliation background job keeps them fresh.
 *
 * Soft-delete-aware: a unique partial index on `(organization_id, git_repo_id)`
 * scoped to `deleted_at IS NULL` lets a marketplace be re-linked after
 * unlinking without colliding with the historic row.
 */
export const MarketplaceSchema = new EntitySchema<
  WithSoftDelete<
    WithTimestamps<
      Marketplace & {
        organization?: Organization;
        gitRepo?: GitRepo;
        addedByUser?: User;
      }
    >
  >
>({
  name: 'Marketplace',
  tableName: 'marketplaces',
  columns: {
    organizationId: {
      name: 'organization_id',
      type: 'uuid',
      nullable: false,
    },
    gitRepoId: {
      name: 'git_repo_id',
      type: 'uuid',
      nullable: false,
    },
    name: {
      type: 'varchar',
      nullable: false,
    },
    vendor: {
      type: 'varchar',
      nullable: false,
    },
    addedBy: {
      name: 'added_by',
      type: 'uuid',
      nullable: false,
    },
    linkedAt: {
      name: 'linked_at',
      type: 'timestamp with time zone',
      nullable: false,
    },
    state: {
      type: 'varchar',
      nullable: false,
      default: 'healthy',
    },
    lastValidatedAt: {
      name: 'last_validated_at',
      type: 'timestamp with time zone',
      nullable: true,
    },
    descriptor: {
      type: 'jsonb',
      nullable: false,
    },
    pluginCount: {
      name: 'plugin_count',
      type: 'integer',
      nullable: false,
      default: 0,
    },
    errorKind: {
      name: 'error_kind',
      type: 'varchar',
      nullable: true,
    },
    errorDetail: {
      name: 'error_detail',
      type: 'text',
      nullable: true,
    },
    pendingPrUrl: {
      name: 'pending_pr_url',
      type: 'text',
      nullable: true,
    },
    outdatedPluginSlugs: {
      name: 'outdated_plugin_slugs',
      type: 'jsonb',
      nullable: true,
    },
    trackingToken: {
      name: 'tracking_token',
      type: 'varchar',
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
    gitRepo: {
      type: 'many-to-one',
      target: 'GitRepo',
      joinColumn: {
        name: 'git_repo_id',
      },
      onDelete: 'CASCADE',
    },
    addedByUser: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: {
        name: 'added_by',
      },
      onDelete: 'RESTRICT',
    },
  },
  indices: [
    {
      name: 'idx_marketplace_organization',
      columns: ['organizationId'],
    },
    {
      name: 'idx_marketplace_organization_git_repo',
      columns: ['organizationId', 'gitRepoId'],
      unique: true,
      where: 'deleted_at IS NULL',
    },
    {
      name: 'idx_marketplace_tracking_token',
      columns: ['trackingToken'],
    },
  ],
});
