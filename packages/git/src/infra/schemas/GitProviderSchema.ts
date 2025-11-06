import { EntitySchema } from 'typeorm';
import { GitProvider } from '../../domain/entities/GitProvider';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/node-utils';
import { GitRepo } from '../../domain/entities/GitRepo';
import { Organization } from '@packmind/accounts';

export const GitProviderSchema = new EntitySchema<
  WithSoftDelete<
    WithTimestamps<
      GitProvider & { repos?: GitRepo[]; organization?: Organization }
    >
  >
>({
  name: 'GitProvider',
  tableName: 'git_providers',
  columns: {
    source: {
      type: 'varchar',
    },
    organizationId: {
      name: 'organization_id',
      type: 'uuid',
    },
    url: {
      type: 'varchar',
      nullable: true,
    },
    token: {
      type: 'varchar',
      nullable: true,
    },
    ...uuidSchema,
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
  relations: {
    repos: {
      type: 'one-to-many',
      target: 'GitRepo',
      inverseSide: 'provider',
    },
    organization: {
      type: 'many-to-one',
      target: 'Organization',
      joinColumn: {
        name: 'organization_id',
      },
      onDelete: 'CASCADE',
    },
  },
});
