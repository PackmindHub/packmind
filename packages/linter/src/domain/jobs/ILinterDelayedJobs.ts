import { GenerateProgramDelayedJob } from '../../application/useCases/generateProgramUseCase/shared/GenerateProgramDelayedJob';
import { AssessRuleDetectionDelayedJob } from '../../application/useCases/assessRuleDetection/shared/AssessRuleDetectionDelayedJob';
import { MoveLinterArtefactsDelayedJob } from '../../application/useCases/moveLinterArtefactsToNewRules/shared/MoveLinterArtefactsDelayedJob';

export interface ILinterDelayedJobs {
  generateProgramDelayedJob: GenerateProgramDelayedJob;
  assessRuleDetectionDelayedJob: AssessRuleDetectionDelayedJob;
  moveLinterArtefactsDelayedJob: MoveLinterArtefactsDelayedJob;
}
