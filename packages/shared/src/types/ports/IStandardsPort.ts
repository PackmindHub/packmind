import {
  Rule,
  RuleId,
  RuleExample,
  Standard,
  StandardId,
  StandardVersion,
  StandardVersionId,
} from '../standards';
import { OrganizationId } from '@packmind/types';
import { SpaceId } from '../spaces';

export interface IStandardsPort {
  getStandard(id: StandardId): Promise<Standard | null>;
  getStandardVersion(id: StandardVersionId): Promise<StandardVersion | null>;
  getRule(id: RuleId): Promise<Rule | null>;
  getLatestRulesByStandardId(id: StandardId): Promise<Rule[]>;
  listStandardsBySpace(
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: string,
  ): Promise<Standard[]>;
  getRuleCodeExamples(id: RuleId): Promise<RuleExample[]>;
  findStandardBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Standard | null>;
}
