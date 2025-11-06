import { OrganizationId, UserId } from '../accounts';
import { ProgrammingLanguage } from '../languages';
import { Rule } from '../standards';
import { RuleDetectionAssessmentId } from './RuleDetectionAssessment';

export interface AssessRuleDetectionInput {
  rule: Rule;
  organizationId: OrganizationId;
  userId: UserId;
  language: ProgrammingLanguage;
  assessmentId: RuleDetectionAssessmentId;
}
