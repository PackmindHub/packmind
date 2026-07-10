import { EntitySchema } from 'typeorm';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/node-utils';
import {
  GitCommit,
  GitCommitId,
  Command,
  CommandVersion,
} from '@packmind/types';

export const CommandVersionSchema = new EntitySchema<
  WithSoftDelete<
    WithTimestamps<
      CommandVersion & {
        recipe?: Command;
        git_commit_id?: GitCommitId;
        gitCommit?: GitCommit;
      }
    >
  >
>({
  name: 'CommandVersion',
  tableName: 'command_versions',
  columns: {
    name: {
      type: 'varchar',
    },
    slug: {
      type: 'varchar',
    },
    content: {
      type: 'text',
    },
    recipeId: {
      name: 'command_id',
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
      nullable: true, // null for git commits, UserId for UI updates
    },
    ...uuidSchema,
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
  relations: {
    recipe: {
      type: 'many-to-one',
      target: 'Command',
      joinColumn: {
        name: 'command_id',
      },
      onDelete: 'CASCADE',
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
});
