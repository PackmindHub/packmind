import { EntitySchema } from 'typeorm';
import { GitCommit } from '../../domain/entities/GitCommit';
import {
  WithTimestamps,
  uuidSchema,
  timestampsSchemas,
} from '@packmind/node-utils';

export const GitCommitSchema = new EntitySchema<WithTimestamps<GitCommit>>({
  name: 'GitCommit',
  tableName: 'git_commits',
  columns: {
    sha: {
      type: 'varchar',
    },
    message: {
      type: 'text',
    },
    author: {
      type: 'varchar',
    },
    url: {
      type: 'varchar',
    },
    ...uuidSchema,
    ...timestampsSchemas,
  },
});
