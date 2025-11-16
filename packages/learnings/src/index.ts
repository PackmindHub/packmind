import { TopicSchema } from './infra/schemas/TopicSchema';
import { KnowledgePatchSchema } from './infra/schemas/KnowledgePatchSchema';

export { LearningsHexa } from './LearningsHexa';
export { LearningsAdapter } from './application/adapter/LearningsAdapter';
export { TopicSchema };
export { KnowledgePatchSchema };

// Export schemas array for TypeORM DataSource registration
export const learningsSchemas = [TopicSchema, KnowledgePatchSchema];
