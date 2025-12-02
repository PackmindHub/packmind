import { EntitySchema } from 'typeorm';
import {
  WithTimestamps,
  timestampsSchemas,
  uuidSchema,
} from '@packmind/node-utils';
import { AIProvider } from '@packmind/types';

export const AIProviderSchema = new EntitySchema<WithTimestamps<AIProvider>>({
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
    ...timestampsSchemas,
  },
  indices: [
    {
      name: 'idx_ai_provider_organization',
      columns: ['organizationId'],
      unique: true,
    },
  ],
});
