import { OrganizationId, SpaceId, UserId } from '@packmind/types';
import { IStandardsPort } from '@packmind/types';
import {
  Rule,
  RuleExample,
  RuleId,
  Standard,
  StandardId,
  StandardVersion,
  StandardVersionId,
  ListStandardsBySpaceCommand,
  UpdateStandardCommand,
  GetStandardByIdResponse,
} from '@packmind/types';
import {
  CreateRuleExampleCommand,
  GetRuleExamplesCommand,
  UpdateRuleExampleCommand,
  DeleteRuleExampleCommand,
} from '../../domain/useCases';
import { IStandardsRepositories } from '../../domain/repositories/IStandardsRepositories';
import { StandardsServices } from '../services/StandardsServices';
import { StandardsUseCases } from './index';

export class StandardsAdapter implements IStandardsPort {
  private readonly services: StandardsServices;
  private readonly repositories: IStandardsRepositories;
  private readonly hexa: import('../../StandardsHexa').StandardsHexa;

  constructor(hexa: import('../../StandardsHexa').StandardsHexa) {
    this.hexa = hexa;
    this.services = hexa.getStandardsServices();
    this.repositories = hexa.getStandardsRepositories();
  }

  /**
   * Lazy-load use cases to avoid calling getStandardsUseCases() before initialization
   */
  private getUseCases(): StandardsUseCases {
    return this.hexa.getStandardsUseCases();
  }

  getLatestRulesByStandardId(id: StandardId): Promise<Rule[]> {
    return this.services
      .getStandardVersionService()
      .getLatestRulesByStandardId(id);
  }

  getRulesByStandardId(id: StandardId): Promise<Rule[]> {
    return this.getUseCases().getRulesByStandardId(id);
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

  getStandardVersionById(
    versionId: StandardVersionId,
  ): Promise<StandardVersion | null> {
    return this.getUseCases().getStandardVersionById(versionId);
  }

  getLatestStandardVersion(
    standardId: StandardId,
  ): Promise<StandardVersion | null> {
    return this.getUseCases().getLatestStandardVersion(standardId);
  }

  listStandardVersions(standardId: StandardId): Promise<StandardVersion[]> {
    return this.getUseCases().listStandardVersions(standardId);
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
    const response = await this.getUseCases().listStandardsBySpace(command);
    return response.standards;
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

  // Additional methods not in IStandardsPort but needed for internal use
  async createStandard(params: {
    name: string;
    description: string;
    rules: Array<{ content: string }>;
    organizationId: OrganizationId;
    userId: UserId;
    scope: string | null;
    spaceId: SpaceId | null;
  }): Promise<Standard> {
    return this.getUseCases().createStandard(params);
  }

  async createStandardWithExamples(params: {
    name: string;
    description: string;
    summary: string | null;
    rules: import('@packmind/types').RuleWithExamples[];
    organizationId: OrganizationId;
    userId: UserId;
    scope: string | null;
    spaceId: SpaceId | null;
  }): Promise<Standard> {
    return this.getUseCases().createStandardWithExamples(params);
  }

  async addRuleToStandard(params: {
    standardSlug: string;
    ruleContent: string;
    organizationId: OrganizationId;
    userId: UserId;
  }): Promise<StandardVersion> {
    return this.getUseCases().addRuleToStandard(params);
  }

  async getStandardById(command: {
    standardId: StandardId;
    organizationId: OrganizationId;
    spaceId: SpaceId;
    userId: string;
  }): Promise<GetStandardByIdResponse> {
    // Use the getStandardById use case which includes access control
    return this.getUseCases().getStandardById(command);
  }

  async deleteStandard(standardId: StandardId, userId: UserId): Promise<void> {
    return this.getUseCases().deleteStandard(standardId, userId);
  }

  async updateStandard(command: UpdateStandardCommand): Promise<Standard> {
    return this.getUseCases().updateStandard(command);
  }

  async deleteStandardsBatch(
    standardIds: StandardId[],
    userId: UserId,
  ): Promise<void> {
    return this.getUseCases().deleteStandardsBatch(standardIds, userId);
  }

  async createRuleExample(
    command: CreateRuleExampleCommand,
  ): Promise<RuleExample> {
    return this.getUseCases().createRuleExample(command);
  }

  async getRuleExamples(
    command: GetRuleExamplesCommand,
  ): Promise<RuleExample[]> {
    return this.getUseCases().getRuleExamples(command);
  }

  async updateRuleExample(
    command: UpdateRuleExampleCommand,
  ): Promise<RuleExample> {
    return this.getUseCases().updateRuleExample(command);
  }

  async deleteRuleExample(command: DeleteRuleExampleCommand): Promise<void> {
    return this.getUseCases().deleteRuleExample(command);
  }
}
