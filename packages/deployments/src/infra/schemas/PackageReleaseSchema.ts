import { EntitySchema } from 'typeorm';
import { PackageRelease } from '@packmind/types';
import { uuidSchema, timestampsSchemas } from '@packmind/node-utils';

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
export const PackageReleaseSchema = new EntitySchema<PackageRelease>({
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
  ],
});
