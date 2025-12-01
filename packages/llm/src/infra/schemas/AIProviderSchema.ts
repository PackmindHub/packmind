import { EntitySchema } from 'typeorm';
import {
  WithSoftDelete,
  WithTimestamps,
  softDeleteSchemas,
  timestampsSchemas,
  uuidSchema,
} from '@packmind/node-utils';
import { AIProvider } from '@packmind/types';

export const AIProviderSchema = new EntitySchema<
  WithSoftDelete<WithTimestamps<AIProvider>>
>({
  name: 'AIProvider',
  tableName: 'ai_providers',
  columns: {
    ...uuidSchema,
    organizationId: {
      name: 'organization_id',
      type: 'uuid',
      nullable: false,
      unique: true,
    },
    config: {
      name: 'config',
      type: 'json',
      nullable: false,
    },
    configuredAt: {
      name: 'configured_at',
      type: 'timestamp with time zone',
      nullable: false,
    },
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
  indices: [
    {
      name: 'idx_ai_provider_organization',
      columns: ['organizationId'],
      unique: true,
      where: 'deleted_at IS NULL',
    },
  ],
});
