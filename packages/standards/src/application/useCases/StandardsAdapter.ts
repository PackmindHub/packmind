import {
  IStandardsPort,
  OrganizationId,
  Rule,
  RuleId,
  Standard,
  StandardId,
  StandardVersion,
  StandardVersionId,
} from '@packmind/shared';
import { IStandardsRepositories } from '../../domain/repositories/IStandardsRepositories';
import { StandardsServices } from '../services/StandardsServices';
import { StandardsHexaFactory } from '../../StandardsHexaFactory';

export class StandardsAdapter implements IStandardsPort {
  private readonly services: StandardsServices;
  private readonly repositories: IStandardsRepositories;

  constructor(hexa: StandardsHexaFactory) {
    this.services = hexa.getStandardsServices();
    this.repositories = hexa.getStandardsRepositories();
  }

  getLatestRulesByStandardId(id: StandardId): Promise<Rule[]> {
    return this.services
      .getStandardVersionService()
      .getLatestRulesByStandardId(id);
  }

  getRule(id: RuleId): Promise<Rule | null> {
    return this.repositories.getRuleRepository().findById(id);
  }

  getStandard(id: StandardId): Promise<Standard | null> {
    return this.services.getStandardService().getStandardById(id);
  }

  getStandardVersion(id: StandardVersionId): Promise<StandardVersion | null> {
    return this.services.getStandardVersionService().getStandardVersionById(id);
  }

  listStandardsByOrganization(id: OrganizationId): Promise<Standard[]> {
    return this.services.getStandardService().listStandardsByOrganization(id);
  }
}
