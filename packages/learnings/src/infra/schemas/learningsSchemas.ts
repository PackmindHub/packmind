import { KnowledgePatchSchema } from './KnowledgePatchSchema';
import { TopicSchema } from './TopicSchema';
import { TopicKnowledgePatchSchema } from './TopicKnowledgePatchSchema';
import { RagLabConfigurationSchema } from './RagLabConfigurationSchema';

export const learningsSchemas = [
  TopicSchema,
  KnowledgePatchSchema,
  TopicKnowledgePatchSchema,
  RagLabConfigurationSchema,
];
