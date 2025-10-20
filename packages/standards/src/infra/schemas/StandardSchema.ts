import { EntitySchema } from 'typeorm';
import { Standard } from '../../domain/entities/Standard';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/shared';
import { StandardVersion } from '../../domain/entities/StandardVersion';
import { GitCommit, GitCommitId } from '@packmind/git';

export const StandardSchema = new EntitySchema<
  WithSoftDelete<
    WithTimestamps<
      Standard & {
        versions?: StandardVersion;
        git_commit_id?: GitCommitId;
        gitCommit?: GitCommit;
      }
    >
  >
>({
  name: 'Standard',
  tableName: 'standards',
  columns: {
    name: {
      type: 'varchar',
    },
    slug: {
      type: 'varchar',
    },
    description: {
      type: 'text',
    },
    version: {
      type: 'int',
    },
    git_commit_id: {
      type: 'uuid',
      nullable: true,
    },
    organizationId: {
      name: 'organization_id',
      type: 'uuid',
      nullable: false,
    },
    userId: {
      name: 'user_id',
      type: 'uuid',
      nullable: false,
    },
    scope: {
      type: 'varchar',
      nullable: true,
    },
    ...uuidSchema,
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
  relations: {
    versions: {
      type: 'one-to-many',
      target: 'StandardVersion',
      inverseSide: 'standard',
    },
    gitCommit: {
      type: 'many-to-one',
      target: 'GitCommit',
      joinColumn: {
        name: 'git_commit_id',
      },
      nullable: true,
    },
  },
  indices: [
    {
      name: 'idx_standard_organization',
      columns: ['organizationId'],
    },
    {
      name: 'idx_standard_user',
      columns: ['userId'],
    },
    {
      name: 'idx_standard_org_user',
      columns: ['organizationId', 'userId'],
    },
    {
      name: 'idx_standard_slug',
      columns: ['slug', 'organizationId'],
      unique: true,
      where: 'deleted_at IS NULL',
    },
  ],
});
