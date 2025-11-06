import { EntitySchema } from 'typeorm';
import { GitRepo } from '../../domain/entities/GitRepo';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/node-utils';
import { GitProvider } from '../../domain/entities/GitProvider';

export const GitRepoSchema = new EntitySchema<
  WithSoftDelete<WithTimestamps<GitRepo & { provider?: GitProvider }>>
>({
  name: 'GitRepo',
  tableName: 'git_repos',
  columns: {
    owner: {
      type: 'varchar',
    },
    repo: {
      type: 'varchar',
    },
    branch: {
      type: 'varchar',
    },
    providerId: {
      name: 'provider_id',
      type: 'uuid',
    },
    ...uuidSchema,
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
  relations: {
    provider: {
      type: 'many-to-one',
      target: 'GitProvider',
      joinColumn: {
        name: 'provider_id',
      },
      onDelete: 'CASCADE',
    },
  },
});
