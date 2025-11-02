import { AssessRuleDetectionInput } from '../AssessRuleDetectionInput';
import { RuleDetectionAssessment } from '../RuleDetectionAssessment';

export interface IStartRuleDetectionAssessmentUseCase {
  execute(
    input: Omit<AssessRuleDetectionInput, 'assessmentId'>,
  ): Promise<RuleDetectionAssessment>;
}
