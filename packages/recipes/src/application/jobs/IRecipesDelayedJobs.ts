import { UpdateRecipesAndGenerateSummariesDelayedJob } from './UpdateRecipesAndGenerateSummariesDelayedJob';
import { DeployRecipesDelayedJob } from './DeployRecipesDelayedJob';

export interface IRecipesDelayedJobs {
  updateRecipesAndGenerateSummariesDelayedJob: UpdateRecipesAndGenerateSummariesDelayedJob;
  deployRecipesDelayedJob: DeployRecipesDelayedJob;
}
