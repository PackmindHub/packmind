import { EntitySchema } from 'typeorm';
import { TopicKnowledgePatch } from '@packmind/types';

export const TopicKnowledgePatchSchema = new EntitySchema<TopicKnowledgePatch>({
  name: 'TopicKnowledgePatch',
  tableName: 'topic_knowledge_patches',
  columns: {
    topicId: {
      name: 'topic_id',
      type: 'uuid',
      nullable: false,
      primary: true,
    },
    knowledgePatchId: {
      name: 'knowledge_patch_id',
      type: 'uuid',
      nullable: false,
      primary: true,
    },
    createdAt: {
      name: 'created_at',
      type: 'timestamp with time zone',
      nullable: false,
      default: () => 'CURRENT_TIMESTAMP',
    },
  },
  indices: [
    {
      name: 'idx_topic_knowledge_patch_topic',
      columns: ['topicId'],
    },
    {
      name: 'idx_topic_knowledge_patch_patch',
      columns: ['knowledgePatchId'],
    },
  ],
});
