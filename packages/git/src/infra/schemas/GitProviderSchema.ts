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
    authMethod: {
      name: 'auth_method',
      type: 'varchar',
      length: 16,
      default: 'token',
    },
    appInstallationId: {
      name: 'app_installation_id',
      type: 'bigint',
      nullable: true,
    },
    appId: {
      name: 'app_id',
      type: 'bigint',
      nullable: true,
    },
    appClientId: {
      name: 'app_client_id',
      type: 'varchar',
      nullable: true,
    },
    appPrivateKey: {
      name: 'app_private_key',
      type: 'text',
      nullable: true,
    },
    revokedAt: {
      name: 'revoked_at',
      type: 'timestamptz',
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
