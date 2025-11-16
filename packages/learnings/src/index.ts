import { TopicSchema } from './infra/schemas/TopicSchema';

export { LearningsHexa } from './LearningsHexa';
export { LearningsAdapter } from './application/adapter/LearningsAdapter';
export { TopicSchema };

// Export schemas array for TypeORM DataSource registration
export const learningsSchemas = [TopicSchema];
