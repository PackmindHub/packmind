import { EntitySchema } from 'typeorm';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/node-utils';
import { Topic, TopicCaptureContext } from '@packmind/types';

export const TopicSchema = new EntitySchema<
  WithSoftDelete<WithTimestamps<Topic>>
>({
  name: 'Topic',
  tableName: 'topics',
  columns: {
    title: {
      type: 'varchar',
      nullable: false,
    },
    content: {
      type: 'text',
      nullable: false,
    },
    codeExamples: {
      name: 'code_examples',
      type: 'jsonb',
      nullable: false,
      default: '[]',
    },
    captureContext: {
      name: 'capture_context',
      type: 'enum',
      enum: TopicCaptureContext,
      nullable: false,
    },
    createdBy: {
      name: 'created_by',
      type: 'uuid',
      nullable: false,
    },
    spaceId: {
      name: 'space_id',
      type: 'uuid',
      nullable: false,
    },
    ...uuidSchema,
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
  indices: [
    {
      name: 'idx_topic_space',
      columns: ['spaceId'],
    },
    {
      name: 'idx_topic_created_by',
      columns: ['createdBy'],
    },
  ],
});
