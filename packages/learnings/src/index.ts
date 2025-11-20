import { TopicSchema } from './infra/schemas/TopicSchema';
import { KnowledgePatchSchema } from './infra/schemas/KnowledgePatchSchema';
import { TopicKnowledgePatchSchema } from './infra/schemas/TopicKnowledgePatchSchema';
import { RagLabConfigurationSchema } from './infra/schemas/RagLabConfigurationSchema';

export { LearningsHexa } from './LearningsHexa';
export { LearningsAdapter } from './application/adapter/LearningsAdapter';
export { LearningsModule } from './learnings.module';
export { TopicSchema };
export { KnowledgePatchSchema };
export { TopicKnowledgePatchSchema };
export { RagLabConfigurationSchema };

// Export schemas array for TypeORM DataSource registration
export const learningsSchemas = [
  TopicSchema,
  KnowledgePatchSchema,
  TopicKnowledgePatchSchema,
  RagLabConfigurationSchema,
];
