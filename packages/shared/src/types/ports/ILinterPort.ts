import { RuleId } from '../standards';
import { OrganizationId, UserId } from '../accounts';
import { ProgrammingLanguage } from '../languages/Language';
import {
  ComputeRuleLanguageDetectionStatusCommand,
  ComputeRuleLanguageDetectionStatusResponse,
} from '../linter/contracts';

export interface CopyDetectionProgramsToNewRuleCommand {
  oldRuleId: RuleId;
  newRuleId: RuleId;
  organizationId: OrganizationId;
  userId: UserId;
}

export interface CopyDetectionProgramsToNewRuleResponse {
  copiedProgramsCount: number;
}

export interface CopyRuleDetectionAssessmentsCommand {
  oldRuleId: RuleId;
  newRuleId: RuleId;
  organizationId: OrganizationId;
  userId: UserId;
}

export interface CopyRuleDetectionAssessmentsResponse {
  copiedAssessmentsCount: number;
}

export interface UpdateRuleDetectionAssessmentAfterUpdateCommand {
  ruleId: RuleId;
  language: ProgrammingLanguage;
  organizationId: OrganizationId;
  userId: UserId;
}

export interface UpdateRuleDetectionAssessmentAfterUpdateResponse {
  action: 'ASSESSMENT_STARTED' | 'STATUS_UPDATED';
  message: string;
}

export interface ILinterPort {
  copyDetectionProgramsToNewRule(
    command: CopyDetectionProgramsToNewRuleCommand,
  ): Promise<CopyDetectionProgramsToNewRuleResponse>;

  copyRuleDetectionAssessments(
    command: CopyRuleDetectionAssessmentsCommand,
  ): Promise<CopyRuleDetectionAssessmentsResponse>;

  updateRuleDetectionAssessmentAfterUpdate(
    command: UpdateRuleDetectionAssessmentAfterUpdateCommand,
  ): Promise<UpdateRuleDetectionAssessmentAfterUpdateResponse>;

  computeRuleLanguageDetectionStatus(
    command: ComputeRuleLanguageDetectionStatusCommand,
  ): Promise<ComputeRuleLanguageDetectionStatusResponse>;
}
