import { EntitySchema } from 'typeorm';
import {
  WithTimestamps,
  uuidSchema,
  timestampsSchemas,
} from '@packmind/node-utils';
import { RagLabConfiguration } from '@packmind/types';

export const RagLabConfigurationSchema = new EntitySchema<
  WithTimestamps<RagLabConfiguration>
>({
  name: 'RagLabConfiguration',
  tableName: 'rag_lab_configurations',
  columns: {
    organizationId: {
      name: 'organization_id',
      type: 'uuid',
      nullable: false,
    },
    embeddingModel: {
      name: 'embedding_model',
      type: 'varchar',
      length: 100,
      nullable: false,
    },
    embeddingDimensions: {
      name: 'embedding_dimensions',
      type: 'integer',
      nullable: false,
    },
    includeCodeBlocks: {
      name: 'include_code_blocks',
      type: 'boolean',
      nullable: false,
    },
    maxTextLength: {
      name: 'max_text_length',
      type: 'integer',
      nullable: true,
    },
    ...uuidSchema,
    ...timestampsSchemas,
  },
  indices: [
    {
      name: 'uq_rag_lab_configurations_organization',
      unique: true,
      columns: ['organizationId'],
    },
  ],
});
