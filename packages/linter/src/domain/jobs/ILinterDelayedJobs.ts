import { GenerateProgramDelayedJob } from '../../application/useCases/generateProgramUseCase/GenerateProgramDelayedJob';
import { AssessRuleDetectionDelayedJob } from '../../application/useCases/assessRuleDetection/AssessRuleDetectionDelayedJob';

export interface ILinterDelayedJobs {
  generateProgramDelayedJob: GenerateProgramDelayedJob;
  assessRuleDetectionDelayedJob: AssessRuleDetectionDelayedJob;
}
