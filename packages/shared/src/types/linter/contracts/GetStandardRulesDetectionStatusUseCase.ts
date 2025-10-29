import { OrganizationId } from '../../accounts/Organization';
import { UserId } from '../../accounts/User';
import { StandardId } from '../../standards/Standard';
import { RuleId } from '../../standards/Rule';
import { ProgrammingLanguage } from '../../languages/Language';
import { RuleLanguageDetectionStatus } from '../../standards/RuleLanguageDetectionStatus';
import { IUseCase } from '../../UseCase';

export type GetStandardRulesDetectionStatusCommand = {
  organizationId: OrganizationId;
  userId: UserId;
  standardId: StandardId;
};

export type RuleLanguageStatus = {
  language: ProgrammingLanguage;
  status: RuleLanguageDetectionStatus;
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
