import { GenerateStandardEmbeddingDelayedJob } from '../../application/jobs/GenerateStandardEmbeddingDelayedJob';
import { GenerateRecipeEmbeddingDelayedJob } from '../../application/jobs/GenerateRecipeEmbeddingDelayedJob';
import { DistillTopicsDelayedJob } from '../../application/jobs/DistillTopicsDelayedJob';

export interface ILearningsDelayedJobs {
  generateRecipeEmbeddingDelayedJob: GenerateRecipeEmbeddingDelayedJob;
  generateStandardEmbeddingDelayedJob: GenerateStandardEmbeddingDelayedJob;
  distillTopicsDelayedJob: DistillTopicsDelayedJob;
}
