import {
  Rule,
  RuleId,
  Standard,
  StandardId,
  StandardVersion,
  StandardVersionId,
} from '../standards';
import { OrganizationId } from '../accounts';

export interface IStandardsPort {
  getStandard(id: StandardId): Promise<Standard | null>;
  getStandardVersion(id: StandardVersionId): Promise<StandardVersion | null>;
  getRule(id: RuleId): Promise<Rule | null>;
  getLatestRulesByStandardId(id: StandardId): Promise<Rule[]>;
  listStandardsByOrganization(id: OrganizationId): Promise<Standard[]>;
}
