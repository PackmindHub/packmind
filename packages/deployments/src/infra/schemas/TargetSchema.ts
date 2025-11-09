import { EntitySchema } from 'typeorm';
import { GitRepo, Target } from '@packmind/types';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/node-utils';

export const TargetSchema = new EntitySchema<
  WithSoftDelete<WithTimestamps<Target & { gitRepo?: GitRepo }>>
>({
  name: 'Target',
  tableName: 'targets',
  columns: {
    name: {
      type: 'varchar',
      nullable: false,
    },
    path: {
      type: 'varchar',
      nullable: false,
    },
    gitRepoId: {
      name: 'git_repo_id',
      type: 'uuid',
      nullable: false,
    },
    ...uuidSchema,
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
  relations: {
    gitRepo: {
      type: 'many-to-one',
      target: 'GitRepo',
      joinColumn: {
        name: 'git_repo_id',
      },
      onDelete: 'CASCADE',
    },
  },
});
