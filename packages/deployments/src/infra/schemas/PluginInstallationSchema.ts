import { EntitySchema } from 'typeorm';
import { Marketplace, Organization, PluginInstallation } from '@packmind/types';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/node-utils';

/**
 * TypeORM schema for the `plugin_installations` table.
 *
 * Each row is a heartbeat record: evidence that a Packmind marketplace plugin
 * was active in a Claude Code session. The UNIQUE constraint on
 * `(marketplace_id, plugin_slug, scope, identity_key, repo_key)` collapses
 * repeated heartbeats into a single row. `created_at` marks the first-seen time
 * (kept as the earliest value on merge); `updated_at` is bumped to the last-seen
 * time on every heartbeat. Both are managed explicitly by the repository.
 *
 * ### Absent-field key rule (§7.1)
 * `identity_key` and `repo_key` are NOT NULL — computed at write time with
 * `''` as the fallback value when the underlying identifier is unavailable.
 * This prevents Postgres from treating each identity-less heartbeat as a new
 * row (Postgres considers NULLs as distinct in UNIQUE indexes).
 *
 * Soft-delete-aware: rows survive marketplace removal for analytics.
 */
export const PluginInstallationSchema = new EntitySchema<
  WithSoftDelete<
    WithTimestamps<
      PluginInstallation & {
        organization?: Organization;
        marketplace?: Marketplace;
      }
    >
  >
>({
  name: 'PluginInstallation',
  tableName: 'plugin_installations',
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
    pluginSlug: {
      name: 'plugin_slug',
      type: 'varchar',
      nullable: false,
    },
    packageId: {
      name: 'package_id',
      type: 'uuid',
      nullable: true,
    },
    /**
     * Version reported as installed (from the plugin manifest). Nullable: rows
     * predating install-version tracking, or heartbeats that could not resolve
     * a version, stay null. Refreshed to the latest reported value on each
     * heartbeat by the repository.
     */
    installedVersion: {
      name: 'installed_version',
      type: 'varchar',
      nullable: true,
    },
    scope: {
      type: 'varchar',
      nullable: false,
    },
    userId: {
      name: 'user_id',
      type: 'uuid',
      nullable: true,
    },
    anonymousIdHash: {
      name: 'anonymous_id_hash',
      type: 'varchar',
      nullable: true,
    },
    anonymousEmailMasked: {
      name: 'anonymous_email_masked',
      type: 'varchar',
      nullable: true,
    },
    /**
     * Computed, NOT NULL.
     * Value: `userId ?? anonymousIdHash ?? ''`
     */
    identityKey: {
      name: 'identity_key',
      type: 'varchar',
      nullable: false,
      default: '',
    },
    repoRemoteUrl: {
      name: 'repo_remote_url',
      type: 'text',
      nullable: true,
    },
    /**
     * Computed, NOT NULL.
     * Value: `''` when `scope = 'user'`, else the normalized `owner/repo` slug
     * of `repoRemoteUrl` ?? the raw `repoRemoteUrl` ?? `''`.
     */
    repoKey: {
      name: 'repo_key',
      type: 'varchar',
      nullable: false,
      default: '',
    },
    ...uuidSchema,
    // `createdAt` doubles as first-seen, `updatedAt` as last-seen. The
    // repository sets both explicitly on insert and bumps `updatedAt` via
    // QueryBuilder on every heartbeat (QueryBuilder `.update()` does not
    // trigger `@UpdateDateColumn`, so the bump is always explicit).
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
  },
  indices: [
    {
      name: 'idx_plugin_installations_marketplace_id',
      columns: ['marketplaceId'],
    },
    {
      name: 'idx_plugin_installations_organization_id',
      columns: ['organizationId'],
    },
    {
      name: 'uq_plugin_installations_unique_heartbeat',
      columns: [
        'marketplaceId',
        'pluginSlug',
        'scope',
        'identityKey',
        'repoKey',
      ],
      unique: true,
    },
  ],
});
