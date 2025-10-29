import {
  IStandardsPort,
  OrganizationId,
  Rule,
  RuleExample,
  RuleId,
  SpaceId,
  Standard,
  StandardId,
  StandardVersion,
  StandardVersionId,
  ListStandardsBySpaceCommand,
} from '@packmind/shared';
import { IStandardsRepositories } from '../../domain/repositories/IStandardsRepositories';
import { StandardsServices } from '../services/StandardsServices';
import { StandardsHexaFactory } from '../../StandardsHexaFactory';
import { StandardsUseCases } from './index';

export class StandardsAdapter implements IStandardsPort {
  private readonly services: StandardsServices;
  private readonly repositories: IStandardsRepositories;
  private readonly useCases: StandardsUseCases;

  constructor(hexa: StandardsHexaFactory) {
    this.services = hexa.getStandardsServices();
    this.repositories = hexa.getStandardsRepositories();
    this.useCases = hexa.getStandardsUseCases();
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

  async listStandardsBySpace(
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: string,
  ): Promise<Standard[]> {
    const command: ListStandardsBySpaceCommand = {
      userId,
      organizationId,
      spaceId,
    };
    const getStandardByIdResponse =
      await this.useCases.listStandardsBySpace(command);
    return getStandardByIdResponse.standards;
  }

  listStandardsByOrganization(
    organizationId: OrganizationId,
  ): Promise<Standard[]> {
    return this.services
      .getStandardService()
      .listStandardsByOrganization(organizationId);
  }

  getRuleCodeExamples(id: RuleId): Promise<RuleExample[]> {
    return this.repositories.getRuleExampleRepository().findByRuleId(id);
  }

  findStandardBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Standard | null> {
    return this.services
      .getStandardService()
      .findStandardBySlug(slug, organizationId);
  }
}
