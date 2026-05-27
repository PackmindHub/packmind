import { EntitySchema } from 'typeorm';
import { GitProvider } from '@packmind/types';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/node-utils';
import { GitRepo } from '@packmind/types';
import { Organization } from '@packmind/types';

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
    authType: {
      name: 'auth_type',
      type: 'varchar',
      length: 32,
      default: 'pat',
    },
    githubAppInstallationId: {
      name: 'github_app_installation_id',
      type: 'bigint',
      nullable: true,
      transformer: {
        to: (value: number | null) => value,
        from: (value: string | number | null) =>
          value === null || value === undefined
            ? null
            : typeof value === 'string'
              ? Number(value)
              : value,
      },
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
