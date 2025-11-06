import { IUseCase } from '@packmind/types';
import { ProgrammingLanguage } from '../../languages/Language';
import { RuleId } from '../../standards/Rule';
import { OrganizationId } from '@packmind/types';
import { UserId } from '@packmind/types';

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
