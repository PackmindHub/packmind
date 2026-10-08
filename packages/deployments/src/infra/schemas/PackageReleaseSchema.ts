import { EntitySchema } from 'typeorm';
import { PackageRelease } from '@packmind/types';
import { uuidSchema, timestampsSchemas } from '@packmind/node-utils';

/**
 * The release as the table stores it: the entity, plus the version's triple
 * split into three sortable integers.
 *
 * Deliberately not on `PackageRelease` itself. The triple is a persistence
 * detail and nothing else — it carries no information `version` does not
 * already carry, it exists so the database can order releases, and putting it
 * on the domain type would make every factory and every hand-built release
 * restate a value derivable from the string beside it.
 *
 * Nullable, because a version the parser refuses has no triple. That is the
 * same row `findLatestByPackageIds` used to skip when picking the newest
 * release in memory; now the skip is a `NOT NULL` in the where clause.
 */
export type PackageReleaseRow = PackageRelease & {
  versionMajor: number | null;
  versionMinor: number | null;
  versionPatch: number | null;
};

/**
 * A release row plus the three join tables pinning its component versions.
 *
 * No soft-delete columns on purpose: a release is immutable and undeletable,
 * so a `deleted_at` nothing writes would only be an invitation to write one.
 *
 * The unique index below is declared here as well as in the migration because
 * repository specs build their tables with `synchronize()` from this schema
 * and never run migrations — an index declared only in the migration would be
 * invisible to every test.
 */
export const PackageReleaseSchema = new EntitySchema<PackageReleaseRow>({
  name: 'PackageRelease',
  tableName: 'package_releases',
  columns: {
    packageId: {
      name: 'package_id',
      type: 'uuid',
      nullable: false,
    },
    version: {
      type: 'varchar',
      nullable: false,
    },
    versionMajor: {
      name: 'version_major',
      type: 'int',
      nullable: true,
    },
    versionMinor: {
      name: 'version_minor',
      type: 'int',
      nullable: true,
    },
    versionPatch: {
      name: 'version_patch',
      type: 'int',
      nullable: true,
    },
    name: {
      type: 'varchar',
      nullable: false,
    },
    description: {
      type: 'text',
      nullable: false,
    },
    ...uuidSchema,
    ...timestampsSchemas,
  },
  relations: {
    recipeVersions: {
      type: 'many-to-many',
      target: 'CommandVersion',
      joinTable: {
        name: 'package_release_command_versions',
        joinColumn: {
          name: 'package_release_id',
          referencedColumnName: 'id',
        },
        inverseJoinColumn: {
          name: 'command_version_id',
          referencedColumnName: 'id',
        },
      },
    },
    standardVersions: {
      type: 'many-to-many',
      target: 'StandardVersion',
      joinTable: {
        name: 'package_release_standard_versions',
        joinColumn: {
          name: 'package_release_id',
          referencedColumnName: 'id',
        },
        inverseJoinColumn: {
          name: 'standard_version_id',
          referencedColumnName: 'id',
        },
      },
    },
    skillVersions: {
      type: 'many-to-many',
      target: 'SkillVersion',
      joinTable: {
        name: 'package_release_skill_versions',
        joinColumn: {
          name: 'package_release_id',
          referencedColumnName: 'id',
        },
        inverseJoinColumn: {
          name: 'skill_version_id',
          referencedColumnName: 'id',
        },
      },
    },
  },
  indices: [
    {
      name: 'idx_package_releases_unique',
      columns: ['packageId', 'version'],
      unique: true,
    },
    /*
     * What lets the newest release of a package be read without reading its
     * history: `DISTINCT ON (package_id)` walks this index in order and stops
     * at the first row of each package.
     */
    {
      name: 'idx_package_releases_latest',
      columns: ['packageId', 'versionMajor', 'versionMinor', 'versionPatch'],
    },
  ],
});
