import {
  RuleDetectionAssessmentId,
  RuleDetectionAssessmentStatus,
} from './RuleDetectionAssessment';

export interface AssessRuleDetectionOutput {
  assessmentId: RuleDetectionAssessmentId;
  status: RuleDetectionAssessmentStatus;
  feasible: boolean;
  details: string;
}
