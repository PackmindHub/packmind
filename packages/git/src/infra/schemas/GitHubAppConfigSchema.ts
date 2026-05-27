import { EntitySchema } from 'typeorm';
import { GitHubAppConfig } from '@packmind/types';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/node-utils';

export const GitHubAppConfigSchema = new EntitySchema<
  WithSoftDelete<WithTimestamps<GitHubAppConfig>>
>({
  name: 'GitHubAppConfig',
  tableName: 'github_app_configs',
  columns: {
    appId: {
      name: 'app_id',
      type: 'bigint',
      transformer: {
        to: (value: number) => value,
        from: (value: string | number) =>
          typeof value === 'string' ? Number(value) : value,
      },
    },
    slug: {
      type: 'varchar',
    },
    htmlUrl: {
      name: 'html_url',
      type: 'varchar',
    },
    clientId: {
      name: 'client_id',
      type: 'varchar',
    },
    clientSecret: {
      name: 'client_secret',
      type: 'text',
    },
    privateKey: {
      name: 'private_key',
      type: 'text',
    },
    webhookSecret: {
      name: 'webhook_secret',
      type: 'text',
    },
    ...uuidSchema,
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
});
