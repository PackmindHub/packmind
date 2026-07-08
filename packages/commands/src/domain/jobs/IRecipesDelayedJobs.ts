import { UpdateRecipesAndGenerateSummariesDelayedJob } from '../../application/jobs/UpdateRecipesAndGenerateSummariesDelayedJob';
import { DeployRecipesDelayedJob } from '../../application/jobs/DeployRecipesDelayedJob';

export interface IRecipesDelayedJobs {
  updateRecipesAndGenerateSummariesDelayedJob: UpdateRecipesAndGenerateSummariesDelayedJob;
  deployRecipesDelayedJob: DeployRecipesDelayedJob;
}
