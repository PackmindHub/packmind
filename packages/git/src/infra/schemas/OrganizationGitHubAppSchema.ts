import { EntitySchema } from 'typeorm';
import { OrganizationGitHubApp } from '@packmind/types';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/node-utils';
import { Organization } from '@packmind/types';

export const OrganizationGitHubAppSchema = new EntitySchema<
  WithSoftDelete<
    WithTimestamps<OrganizationGitHubApp & { organization?: Organization }>
  >
>({
  name: 'OrganizationGitHubApp',
  tableName: 'organization_github_apps',
  columns: {
    organizationId: {
      name: 'organization_id',
      type: 'uuid',
    },
    appId: {
      name: 'app_id',
      type: 'bigint',
    },
    appSlug: {
      name: 'app_slug',
      type: 'varchar',
    },
    appClientId: {
      name: 'app_client_id',
      type: 'varchar',
    },
    appClientSecret: {
      name: 'app_client_secret',
      type: 'text',
    },
    appPrivateKey: {
      name: 'app_private_key',
      type: 'text',
    },
    appWebhookSecret: {
      name: 'app_webhook_secret',
      type: 'text',
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
    organization: {
      type: 'many-to-one',
      target: 'Organization',
      joinColumn: {
        name: 'organization_id',
      },
      onDelete: 'CASCADE',
    },
  },
  indices: [
    {
      name: 'IDX_org_github_app_organization_id',
      columns: ['organizationId'],
    },
  ],
});
