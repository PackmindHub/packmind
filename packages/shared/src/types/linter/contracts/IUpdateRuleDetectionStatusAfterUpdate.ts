import { IUseCase } from '../../UseCase';
import { ProgrammingLanguage } from '../../languages/Language';
import { RuleId } from '../../standards/Rule';
import { OrganizationId } from '../../accounts/Organization';
import { UserId } from '../../accounts/User';

export type UpdateRuleDetectionStatusAfterUpdateCommand = {
  ruleId: RuleId;
  language: ProgrammingLanguage;
  organizationId: OrganizationId;
  userId: UserId;
};

export type UpdateRuleDetectionStatusAfterUpdateResponse = {
  action: 'ASSESSMENT_STARTED' | 'STATUS_UPDATED' | 'NO_ACTION';
  message: string;
};

export type IUpdateRuleDetectionStatusAfterUpdateUseCase = IUseCase<
  UpdateRuleDetectionStatusAfterUpdateCommand,
  UpdateRuleDetectionStatusAfterUpdateResponse
>;
