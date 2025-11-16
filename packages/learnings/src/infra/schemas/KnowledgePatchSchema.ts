import { EntitySchema } from 'typeorm';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/node-utils';
import {
  KnowledgePatch,
  KnowledgePatchStatus,
  KnowledgePatchType,
} from '@packmind/types';

export const KnowledgePatchSchema = new EntitySchema<
  WithSoftDelete<WithTimestamps<KnowledgePatch>>
>({
  name: 'KnowledgePatch',
  tableName: 'knowledge_patches',
  columns: {
    spaceId: {
      name: 'space_id',
      type: 'uuid',
      nullable: false,
    },
    topicId: {
      name: 'topic_id',
      type: 'uuid',
      nullable: false,
    },
    patchType: {
      name: 'patch_type',
      type: 'enum',
      enum: KnowledgePatchType,
      nullable: false,
    },
    proposedChanges: {
      name: 'proposed_changes',
      type: 'jsonb',
      nullable: false,
    },
    diffOriginal: {
      name: 'diff_original',
      type: 'text',
      nullable: false,
    },
    diffModified: {
      name: 'diff_modified',
      type: 'text',
      nullable: false,
    },
    status: {
      type: 'enum',
      enum: KnowledgePatchStatus,
      nullable: false,
      default: `'${KnowledgePatchStatus.PENDING_REVIEW}'`,
    },
    reviewedBy: {
      name: 'reviewed_by',
      type: 'uuid',
      nullable: true,
    },
    reviewedAt: {
      name: 'reviewed_at',
      type: 'timestamp with time zone',
      nullable: true,
    },
    reviewNotes: {
      name: 'review_notes',
      type: 'text',
      nullable: true,
    },
    ...uuidSchema,
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
  indices: [
    {
      name: 'idx_knowledge_patch_topic',
      columns: ['topicId'],
    },
    {
      name: 'idx_knowledge_patch_space',
      columns: ['spaceId'],
    },
    {
      name: 'idx_knowledge_patch_status',
      columns: ['status'],
    },
  ],
});
