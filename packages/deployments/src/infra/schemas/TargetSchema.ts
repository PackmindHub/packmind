import { EntitySchema } from 'typeorm';
import { Target, GitRepo } from '@packmind/shared';
import {
  WithTimestamps,
  uuidSchema,
  timestampsSchemas,
} from '@packmind/shared';

export const TargetSchema = new EntitySchema<
  WithTimestamps<Target & { gitRepo?: GitRepo }>
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
