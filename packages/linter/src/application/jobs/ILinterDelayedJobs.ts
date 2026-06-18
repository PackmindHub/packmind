import { GenerateProgramDelayedJob } from '../useCases/generateProgramUseCase/shared/GenerateProgramDelayedJob';
import { AssessRuleDetectionDelayedJob } from '../useCases/assessRuleDetection/shared/AssessRuleDetectionDelayedJob';
import { MoveLinterArtefactsDelayedJob } from '../useCases/moveLinterArtefactsToNewRules/shared/MoveLinterArtefactsDelayedJob';

export interface ILinterDelayedJobs {
  generateProgramDelayedJob: GenerateProgramDelayedJob;
  assessRuleDetectionDelayedJob: AssessRuleDetectionDelayedJob;
  moveLinterArtefactsDelayedJob: MoveLinterArtefactsDelayedJob;
}
