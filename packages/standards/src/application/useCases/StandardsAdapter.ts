import { PackmindLogger } from '@packmind/logger';
import {
  IAccountsPort,
  IDeploymentPort,
  ILinterPort,
  ISpacesPort,
  OrganizationId,
  SpaceId,
  UserId,
} from '@packmind/types';
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
import { IStandardDelayedJobs } from '../../domain/jobs/IStandardDelayedJobs';
import { StandardsServices } from '../services/StandardsServices';
import { CreateStandardUsecase } from './createStandard/createStandard.usecase';
import { CreateStandardWithExamplesUsecase } from './createStandardWithExamples/createStandardWithExamples.usecase';
import { UpdateStandardUsecase } from './updateStandard/updateStandard.usecase';
import { AddRuleToStandardUsecase } from './addRuleToStandard/addRuleToStandard.usecase';
import { GetStandardByIdUsecase } from './getStandardById/getStandardById.usecase';
import { ListStandardsBySpaceUsecase } from './listStandardsBySpace/listStandardsBySpace.usecase';
import { ListStandardVersionsUsecase } from './listStandardVersions/listStandardVersions.usecase';
import { GetRulesByStandardIdUsecase } from './getRulesByStandardId/getRulesByStandardId.usecase';
import { FindStandardBySlugUsecase } from './findStandardBySlug/findStandardBySlug.usecase';
import { GetStandardVersionUsecase } from './getStandardVersion/getStandardVersion.usecase';
import { GetLatestStandardVersionUsecase } from './getLatestStandardVersion/getLatestStandardVersion.usecase';
import { GetStandardVersionByIdUsecase } from './getStandardVersionById/getStandardVersionById.usecase';
import { DeleteStandardUsecase } from './deleteStandard/deleteStandard.usecase';
import { DeleteStandardsBatchUsecase } from './deleteStandardsBatch/deleteStandardsBatch.usecase';
import { CreateRuleExampleUsecase } from './createRuleExample/createRuleExample.usecase';
import { GetRuleExamplesUsecase } from './getRuleExamples/getRuleExamples.usecase';
import { UpdateRuleExampleUsecase } from './updateRuleExample/updateRuleExample.usecase';
import { DeleteRuleExampleUsecase } from './deleteRuleExample/deleteRuleExample.usecase';

const origin = 'StandardsAdapter';

export class StandardsAdapter implements IStandardsPort {
  private readonly services: StandardsServices;
  private readonly repositories: IStandardsRepositories;
  private readonly logger: PackmindLogger;
  private readonly standardDelayedJobs: IStandardDelayedJobs;

  // Use cases
  private readonly _createStandard: CreateStandardUsecase;
  private _createStandardWithExamples: CreateStandardWithExamplesUsecase;
  private readonly _updateStandard: UpdateStandardUsecase;
  private _addRuleToStandard: AddRuleToStandardUsecase;
  private readonly _getStandardById: GetStandardByIdUsecase;
  private readonly _findStandardBySlug: FindStandardBySlugUsecase;
  private readonly _listStandardsBySpace: ListStandardsBySpaceUsecase;
  private readonly _listStandardVersions: ListStandardVersionsUsecase;
  private readonly _getStandardVersion: GetStandardVersionUsecase;
  private readonly _getLatestStandardVersion: GetLatestStandardVersionUsecase;
  private readonly _getStandardVersionById: GetStandardVersionByIdUsecase;
  private readonly _getRulesByStandardId: GetRulesByStandardIdUsecase;
  private readonly _deleteStandard: DeleteStandardUsecase;
  private readonly _deleteStandardsBatch: DeleteStandardsBatchUsecase;
  private _createRuleExample: CreateRuleExampleUsecase;
  private readonly _getRuleExamples: GetRuleExamplesUsecase;
  private _updateRuleExample: UpdateRuleExampleUsecase;
  private _deleteRuleExample: DeleteRuleExampleUsecase;

  constructor(
    services: StandardsServices,
    repositories: IStandardsRepositories,
    standardDelayedJobs: IStandardDelayedJobs,
    accountsAdapter: IAccountsPort,
    spacesPort: ISpacesPort | null,
    linterAdapter: ILinterPort | undefined,
    deploymentsQueryAdapter: IDeploymentPort | undefined,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.services = services;
    this.repositories = repositories;
    this.logger = logger;
    this.standardDelayedJobs = standardDelayedJobs;

    // Initialize all use cases
    this._createStandard = new CreateStandardUsecase(
      services.getStandardService(),
      services.getStandardVersionService(),
      standardDelayedJobs.standardSummaryDelayedJob,
    );

    this._createStandardWithExamples = new CreateStandardWithExamplesUsecase(
      services.getStandardService(),
      services.getStandardVersionService(),
      services.getStandardSummaryService(),
      repositories.getRuleExampleRepository(),
      repositories.getRuleRepository(),
      linterAdapter,
    );

    this._updateStandard = new UpdateStandardUsecase(
      accountsAdapter,
      services.getStandardService(),
      services.getStandardVersionService(),
      repositories.getRuleRepository(),
      repositories.getRuleExampleRepository(),
      standardDelayedJobs.standardSummaryDelayedJob,
      spacesPort,
    );

    this._addRuleToStandard = new AddRuleToStandardUsecase(
      services.getStandardService(),
      services.getStandardVersionService(),
      repositories.getRuleRepository(),
      repositories.getRuleExampleRepository(),
      standardDelayedJobs.standardSummaryDelayedJob,
      linterAdapter,
    );

    this._getStandardById = new GetStandardByIdUsecase(
      accountsAdapter,
      services.getStandardService(),
      spacesPort,
    );

    this._findStandardBySlug = new FindStandardBySlugUsecase(
      services.getStandardService(),
    );

    this._listStandardsBySpace = new ListStandardsBySpaceUsecase(
      accountsAdapter,
      services.getStandardService(),
      spacesPort,
    );

    this._listStandardVersions = new ListStandardVersionsUsecase(
      services.getStandardVersionService(),
    );

    this._getStandardVersion = new GetStandardVersionUsecase(
      services.getStandardVersionService(),
    );

    this._getLatestStandardVersion = new GetLatestStandardVersionUsecase(
      services.getStandardVersionService(),
    );

    this._getStandardVersionById = new GetStandardVersionByIdUsecase(
      services.getStandardVersionService(),
    );

    this._getRulesByStandardId = new GetRulesByStandardIdUsecase(
      services.getStandardVersionService(),
    );

    this._deleteStandard = new DeleteStandardUsecase(
      services.getStandardService(),
    );

    this._deleteStandardsBatch = new DeleteStandardsBatchUsecase(
      services.getStandardService(),
    );

    this._createRuleExample = new CreateRuleExampleUsecase(
      repositories.getRuleExampleRepository(),
      repositories.getRuleRepository(),
      linterAdapter,
    );

    this._getRuleExamples = new GetRuleExamplesUsecase(
      repositories.getRuleExampleRepository(),
      repositories.getRuleRepository(),
    );

    this._updateRuleExample = new UpdateRuleExampleUsecase(
      repositories,
      linterAdapter,
    );

    this._deleteRuleExample = new DeleteRuleExampleUsecase(
      repositories,
      linterAdapter,
    );

    this.logger.info('StandardsAdapter initialized successfully');
  }

  /**
   * Set the linter adapter (for runtime wiring after initialization)
   */
  public setLinterAdapter(adapter: ILinterPort): void {
    this.logger.info('Setting linter adapter in StandardsAdapter');

    // Recreate use cases that depend on linter adapter
    this._createStandardWithExamples = new CreateStandardWithExamplesUsecase(
      this.services.getStandardService(),
      this.services.getStandardVersionService(),
      this.services.getStandardSummaryService(),
      this.repositories.getRuleExampleRepository(),
      this.repositories.getRuleRepository(),
      adapter,
    );

    this._createRuleExample = new CreateRuleExampleUsecase(
      this.repositories.getRuleExampleRepository(),
      this.repositories.getRuleRepository(),
      adapter,
    );

    this._updateRuleExample = new UpdateRuleExampleUsecase(
      this.repositories,
      adapter,
    );

    this._deleteRuleExample = new DeleteRuleExampleUsecase(
      this.repositories,
      adapter,
    );

    this._addRuleToStandard = new AddRuleToStandardUsecase(
      this.services.getStandardService(),
      this.services.getStandardVersionService(),
      this.repositories.getRuleRepository(),
      this.repositories.getRuleExampleRepository(),
      this.standardDelayedJobs.standardSummaryDelayedJob,
      adapter,
    );

    this.logger.info('Use cases recreated with linter adapter');
  }

  // ===========================
  // IStandardsPort Implementation
  // ===========================

  getLatestRulesByStandardId(id: StandardId): Promise<Rule[]> {
    return this.services
      .getStandardVersionService()
      .getLatestRulesByStandardId(id);
  }

  getRulesByStandardId(id: StandardId): Promise<Rule[]> {
    return this._getRulesByStandardId.getRulesByStandardId(id);
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
    return this._getStandardVersionById.getStandardVersionById(versionId);
  }

  getLatestStandardVersion(
    standardId: StandardId,
  ): Promise<StandardVersion | null> {
    return this._getLatestStandardVersion.getLatestStandardVersion(standardId);
  }

  listStandardVersions(standardId: StandardId): Promise<StandardVersion[]> {
    return this._listStandardVersions.listStandardVersions(standardId);
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
    const response = await this._listStandardsBySpace.execute(command);
    return response.standards;
  }

  getRuleCodeExamples(id: RuleId): Promise<RuleExample[]> {
    return this.repositories.getRuleExampleRepository().findByRuleId(id);
  }

  findStandardBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Standard | null> {
    return this._findStandardBySlug.findStandardBySlug(slug, organizationId);
  }

  // ===========================
  // Additional Public Methods
  // ===========================

  async createStandard(params: {
    name: string;
    description: string;
    rules: Array<{ content: string }>;
    organizationId: OrganizationId;
    userId: UserId;
    scope: string | null;
    spaceId: SpaceId | null;
  }): Promise<Standard> {
    return this._createStandard.execute({
      ...params,
      organizationId: params.organizationId.toString(),
      userId: params.userId.toString(),
      spaceId: params.spaceId?.toString() || '',
    });
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
    if (!params.spaceId) {
      throw new Error(
        'SpaceId is required for creating standards with examples',
      );
    }
    return this._createStandardWithExamples.createStandardWithExamples({
      ...params,
      spaceId: params.spaceId,
    });
  }

  async addRuleToStandard(params: {
    standardSlug: string;
    ruleContent: string;
    organizationId: OrganizationId;
    userId: UserId;
  }): Promise<StandardVersion> {
    return this._addRuleToStandard.addRuleToStandard(params);
  }

  async getStandardById(command: {
    standardId: StandardId;
    organizationId: OrganizationId;
    spaceId: SpaceId;
    userId: string;
  }): Promise<GetStandardByIdResponse> {
    return this._getStandardById.execute(command);
  }

  async deleteStandard(standardId: StandardId, userId: UserId): Promise<void> {
    return this._deleteStandard.deleteStandard(standardId, userId);
  }

  async updateStandard(command: UpdateStandardCommand): Promise<Standard> {
    const result = await this._updateStandard.execute(command);
    return result.standard;
  }

  async deleteStandardsBatch(
    standardIds: StandardId[],
    userId: UserId,
  ): Promise<void> {
    return this._deleteStandardsBatch.deleteStandardsBatch(standardIds, userId);
  }

  async createRuleExample(
    command: CreateRuleExampleCommand,
  ): Promise<RuleExample> {
    return this._createRuleExample.execute(command);
  }

  async getRuleExamples(
    command: GetRuleExamplesCommand,
  ): Promise<RuleExample[]> {
    return this._getRuleExamples.getRuleExamples(command);
  }

  async updateRuleExample(
    command: UpdateRuleExampleCommand,
  ): Promise<RuleExample> {
    return this._updateRuleExample.execute(command);
  }

  async deleteRuleExample(command: DeleteRuleExampleCommand): Promise<void> {
    return this._deleteRuleExample.execute(command);
  }
}
