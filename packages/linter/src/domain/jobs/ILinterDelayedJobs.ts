import { GenerateProgramDelayedJob } from '../../application/useCases/generateProgramUseCase/GenerateProgramDelayedJob';
import { AssessRuleDetectionDelayedJob } from '../../application/useCases/assessRuleDetection/AssessRuleDetectionDelayedJob';
import { MoveLinterArtefactsDelayedJob } from '../../application/useCases/moveLinterArtefactsToNewRules/MoveLinterArtefactsDelayedJob';

export interface ILinterDelayedJobs {
  generateProgramDelayedJob: GenerateProgramDelayedJob;
  assessRuleDetectionDelayedJob: AssessRuleDetectionDelayedJob;
  moveLinterArtefactsDelayedJob: MoveLinterArtefactsDelayedJob;
}
