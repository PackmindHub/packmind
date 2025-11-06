import { RuleExample, StandardVersion } from '@packmind/types';
import { OrganizationId, UserId } from '@packmind/accounts';

export interface GenerateStandardSummaryInput {
  organizationId: OrganizationId;
  userId: UserId;
  standardVersion: StandardVersion;
  rules: Array<{
    content: string;
    examples: RuleExample[];
  }>;
}

export interface GenerateStandardSummaryOutput {
  organizationId: OrganizationId;
  userId: UserId;
  standardVersion: StandardVersion;
  summary: string;
}
