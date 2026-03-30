import { OrganizationId, UserId } from '../../accounts';
import { StandardId, RuleId } from '../../standards';
import { ProgrammingLanguage } from '../../languages';
import { RuleLanguageDetectionStatus } from '../../standards';
import { IUseCase } from '../../UseCase';
import {
  DetectionSeverity,
  ActiveDetectionProgramId,
} from '../ActiveDetectionProgram';

export type GetStandardRulesDetectionStatusCommand = {
  organizationId: OrganizationId;
  userId: UserId;
  standardId: StandardId;
};

export type RuleLanguageStatus = {
  language: ProgrammingLanguage;
  status: RuleLanguageDetectionStatus;
  severity?: DetectionSeverity;
  activeDetectionProgramId?: ActiveDetectionProgramId;
};

export type RuleDetectionStatusSummary = {
  ruleId: RuleId;
  languages: RuleLanguageStatus[];
};

export type GetStandardRulesDetectionStatusResponse = {
  rules: RuleDetectionStatusSummary[];
};

export type IGetStandardRulesDetectionStatusUseCase = IUseCase<
  GetStandardRulesDetectionStatusCommand,
  GetStandardRulesDetectionStatusResponse
>;
