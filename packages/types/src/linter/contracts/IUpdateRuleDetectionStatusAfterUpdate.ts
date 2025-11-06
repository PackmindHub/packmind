import { IUseCase } from '../../UseCase';
import { ProgrammingLanguage } from '../../languages';
import { RuleId } from '../../standards';
import { OrganizationId, UserId } from '../../accounts';

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
