import { OrganizationId } from '../../accounts/Organization';
import { SpaceId } from '../../spaces/SpaceId';
import { Rule } from '../Rule';
import { RuleId } from '../RuleId';
import { RuleExample } from '../RuleExample';
import { Standard } from '../Standard';
import { StandardId } from '../StandardId';
import { StandardVersion } from '../StandardVersion';
import { StandardVersionId } from '../StandardVersionId';

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
