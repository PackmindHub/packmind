import {
  OrganizationId,
  RuleExample,
  RuleExampleId,
  RuleId,
  SpaceId,
  StandardId,
} from '@packmind/types';

export interface IRulesGateway {
  createRuleExample(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    standardId: StandardId,
    ruleId: RuleId,
    example: {
      lang: string;
      positive: string;
      negative: string;
    },
  ): Promise<RuleExample>;

  getRuleExamples(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    standardId: StandardId,
    ruleId: RuleId,
  ): Promise<RuleExample[]>;

  updateRuleExample(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    standardId: StandardId,
    ruleId: RuleId,
    exampleId: RuleExampleId,
    updates: {
      lang?: string;
      positive?: string;
      negative?: string;
    },
  ): Promise<RuleExample>;

  deleteRuleExample(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    standardId: StandardId,
    ruleId: RuleId,
    exampleId: RuleExampleId,
  ): Promise<void>;
}
