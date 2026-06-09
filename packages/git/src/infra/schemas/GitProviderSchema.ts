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
import { OrganizationGitHubApp } from '@packmind/types';

export const GitProviderSchema = new EntitySchema<
  WithSoftDelete<
    WithTimestamps<
      GitProvider & {
        repos?: GitRepo[];
        organization?: Organization;
        organizationGitHubApp?: OrganizationGitHubApp;
      }
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
    displayName: {
      name: 'display_name',
      type: 'varchar',
      length: 64,
      default: '',
    },
    appInstallationId: {
      name: 'app_installation_id',
      type: 'bigint',
      nullable: true,
    },
    organizationGitHubAppId: {
      name: 'organization_github_app_id',
      type: 'uuid',
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
    organizationGitHubApp: {
      type: 'many-to-one',
      target: 'OrganizationGitHubApp',
      joinColumn: {
        name: 'organization_github_app_id',
      },
      onDelete: 'RESTRICT',
    },
  },
});
