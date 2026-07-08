import { UpdateCommandsAndGenerateSummariesDelayedJob } from '../../application/jobs/UpdateCommandsAndGenerateSummariesDelayedJob';
import { DeployCommandsDelayedJob } from '../../application/jobs/DeployCommandsDelayedJob';

export interface ICommandsDelayedJobs {
  updateRecipesAndGenerateSummariesDelayedJob: UpdateCommandsAndGenerateSummariesDelayedJob;
  deployRecipesDelayedJob: DeployCommandsDelayedJob;
}
