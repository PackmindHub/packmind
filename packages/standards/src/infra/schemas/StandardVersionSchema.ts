import { EntitySchema } from 'typeorm';
import { StandardVersion } from '../../domain/entities/StandardVersion';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/shared';
import { Standard } from '../../domain/entities/Standard';
import { Rule } from '../../domain/entities/Rule';
import { GitCommit, GitCommitId } from '@packmind/git';
import { UserId } from '@packmind/types';

export const StandardVersionSchema = new EntitySchema<
  WithSoftDelete<
    WithTimestamps<
      StandardVersion & {
        standard?: Standard;
        rules?: Rule[];
        git_commit_id?: GitCommitId;
        gitCommit?: GitCommit;
        user_id?: UserId;
      }
    >
  >
>({
  name: 'StandardVersion',
  tableName: 'standard_versions',
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
    summary: {
      type: 'text',
      nullable: true,
    },
    standardId: {
      name: 'standard_id',
      type: 'uuid',
    },
    version: {
      type: 'int',
    },
    git_commit_id: {
      type: 'uuid',
      nullable: true,
    },
    userId: {
      name: 'user_id',
      type: 'uuid',
      nullable: true,
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
    standard: {
      type: 'many-to-one',
      target: 'Standard',
      joinColumn: {
        name: 'standard_id',
      },
      onDelete: 'CASCADE',
    },
    rules: {
      type: 'one-to-many',
      target: 'Rule',
      inverseSide: 'standardVersion',
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
      name: 'idx_standard_version_standard',
      columns: ['standardId'],
    },
    {
      name: 'idx_standard_version_unique',
      columns: ['standardId', 'version'],
      unique: true,
    },
  ],
});
