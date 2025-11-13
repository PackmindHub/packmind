import { Factory } from '@packmind/test-utils';
import {
  createRuleId,
  ProgrammingLanguage,
  DetectionModeEnum,
  createRuleDetectionAssessmentId,
  type RuleDetectionAssessment,
  RuleDetectionAssessmentStatus,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

export const ruleDetectionAssessmentFactory: Factory<
  RuleDetectionAssessment
> = (assessment?: Partial<RuleDetectionAssessment>) => {
  return {
    id: createRuleDetectionAssessmentId(uuidv4()),
    ruleId: createRuleId(uuidv4()),
    language: ProgrammingLanguage.JAVASCRIPT,
    detectionMode: DetectionModeEnum.SINGLE_AST,
    status: RuleDetectionAssessmentStatus.NOT_STARTED,
    details: '',
    clarificationQuestion: null,
    clarificationAnswers: null,
    ...assessment,
  };
};
