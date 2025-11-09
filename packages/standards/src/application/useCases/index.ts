import { PackmindLogger } from '@packmind/logger';
import { IAccountsPort, ISpacesPort } from '@packmind/types';
import {
  ListStandardsBySpaceCommand,
  GetStandardByIdCommand,
  UpdateStandardCommand,
  ListStandardsBySpaceResponse,
  GetStandardByIdResponse,
} from '@packmind/types';
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
import { IStandardsServices } from '../IStandardsServices';
import { IStandardsRepositories } from '../../domain/repositories/IStandardsRepositories';
import { OrganizationId, UserId } from '@packmind/accounts';
import { SpaceId } from '@packmind/types';
import { StandardId } from '../../domain/entities';
import { RuleExample } from '../../domain/entities';
import { StandardVersionId } from '../../domain/entities';
import {
  CreateRuleExampleCommand,
  GetRuleExamplesCommand,
  UpdateRuleExampleCommand,
  DeleteRuleExampleCommand,
} from '../../domain/useCases';
import { IDeploymentPort, ILinterPort } from '@packmind/types';
import { IStandardDelayedJobs } from '../../domain/jobs/IStandardDelayedJobs';

const origin = 'StandardsUseCases';

export class StandardsUseCases {
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
    private readonly standardsServices: IStandardsServices,
    private readonly standardsRepositories: IStandardsRepositories,
    private deploymentsQueryAdapter: IDeploymentPort | undefined,
    private standardDelayedJobs: IStandardDelayedJobs,
    private readonly accountsAdapter: IAccountsPort,
    private readonly spacesPort: ISpacesPort | null,
    private linterAdapter: ILinterPort | undefined,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this._createStandard = new CreateStandardUsecase(
      standardsServices.getStandardService(),
      standardsServices.getStandardVersionService(),
      standardDelayedJobs.standardSummaryDelayedJob,
    );
    this._createStandardWithExamples = new CreateStandardWithExamplesUsecase(
      standardsServices.getStandardService(),
      standardsServices.getStandardVersionService(),
      standardsServices.getStandardSummaryService(),
      standardsRepositories.getRuleExampleRepository(),
      standardsRepositories.getRuleRepository(),
      this.linterAdapter,
    );
    this._updateStandard = new UpdateStandardUsecase(
      accountsAdapter,
      standardsServices.getStandardService(),
      standardsServices.getStandardVersionService(),
      standardsRepositories.getRuleRepository(),
      standardsRepositories.getRuleExampleRepository(),
      this.standardDelayedJobs.standardSummaryDelayedJob,
      spacesPort,
    );
    this._addRuleToStandard = new AddRuleToStandardUsecase(
      standardsServices.getStandardService(),
      standardsServices.getStandardVersionService(),
      standardsRepositories.getRuleRepository(),
      standardsRepositories.getRuleExampleRepository(),
      this.standardDelayedJobs.standardSummaryDelayedJob,
      this.linterAdapter,
    );
    this._getStandardById = new GetStandardByIdUsecase(
      accountsAdapter,
      standardsServices.getStandardService(),
      spacesPort,
    );
    this._findStandardBySlug = new FindStandardBySlugUsecase(
      standardsServices.getStandardService(),
    );
    this._listStandardsBySpace = new ListStandardsBySpaceUsecase(
      accountsAdapter,
      standardsServices.getStandardService(),
      spacesPort,
    );
    this._listStandardVersions = new ListStandardVersionsUsecase(
      standardsServices.getStandardVersionService(),
    );
    this._getStandardVersion = new GetStandardVersionUsecase(
      standardsServices.getStandardVersionService(),
    );
    this._getLatestStandardVersion = new GetLatestStandardVersionUsecase(
      standardsServices.getStandardVersionService(),
    );
    this._getStandardVersionById = new GetStandardVersionByIdUsecase(
      standardsServices.getStandardVersionService(),
    );
    this._getRulesByStandardId = new GetRulesByStandardIdUsecase(
      standardsServices.getStandardVersionService(),
    );
    this._deleteStandard = new DeleteStandardUsecase(
      standardsServices.getStandardService(),
    );
    this._deleteStandardsBatch = new DeleteStandardsBatchUsecase(
      standardsServices.getStandardService(),
    );
    this._createRuleExample = new CreateRuleExampleUsecase(
      standardsRepositories.getRuleExampleRepository(),
      standardsRepositories.getRuleRepository(),
      this.linterAdapter,
    );
    this._getRuleExamples = new GetRuleExamplesUsecase(
      standardsRepositories.getRuleExampleRepository(),
      standardsRepositories.getRuleRepository(),
    );
    this._updateRuleExample = new UpdateRuleExampleUsecase(
      standardsRepositories,
      this.linterAdapter,
    );
    this._deleteRuleExample = new DeleteRuleExampleUsecase(
      standardsRepositories,
      this.linterAdapter,
    );

    this.logger.info('StandardsUseCases initialized successfully');
  }

  /**
   * Set the deployments query adapter (for runtime wiring)
   */
  public setDeploymentsQueryAdapter(adapter: IDeploymentPort): void {
    this.deploymentsQueryAdapter = adapter;
    // Update the ListDetectionProgramUseCase with the new adapter
    // this._listDetectionPrograms = new ListDetectionProgramUseCase(
    //   this.standardsServices.getStandardService(),
    //   this.standardsServices.getStandardVersionService(),
    //   this.standardsServices.getDetectionProgramService(),
    //   this.deploymentsQueryAdapter,
    //   this.gitHexa,
    //   this.logger,
    // );
  }

  public setLinterAdapter(adapter: ILinterPort): void {
    this.logger.info('Setting linter adapter in StandardsUseCases');
    this.linterAdapter = adapter;

    // Recreate use cases that depend on linter adapter
    this._createStandardWithExamples = new CreateStandardWithExamplesUsecase(
      this.standardsServices.getStandardService(),
      this.standardsServices.getStandardVersionService(),
      this.standardsServices.getStandardSummaryService(),
      this.standardsRepositories.getRuleExampleRepository(),
      this.standardsRepositories.getRuleRepository(),
      adapter,
    );

    this._createRuleExample = new CreateRuleExampleUsecase(
      this.standardsRepositories.getRuleExampleRepository(),
      this.standardsRepositories.getRuleRepository(),
      adapter,
    );

    this._updateRuleExample = new UpdateRuleExampleUsecase(
      this.standardsRepositories,
      adapter,
    );

    this._deleteRuleExample = new DeleteRuleExampleUsecase(
      this.standardsRepositories,
      adapter,
    );

    this._addRuleToStandard = new AddRuleToStandardUsecase(
      this.standardsServices.getStandardService(),
      this.standardsServices.getStandardVersionService(),
      this.standardsRepositories.getRuleRepository(),
      this.standardsRepositories.getRuleExampleRepository(),
      this.standardDelayedJobs.standardSummaryDelayedJob,
      adapter,
    );

    this.logger.info('Use cases recreated with linter adapter');
  }

  // ===========================
  // CORE STANDARD MANAGEMENT
  // ===========================

  /**
   * Create a new standard with initial content
   */
  public async createStandard(params: {
    name: string;
    description: string;
    rules: Array<{ content: string }>;
    organizationId: OrganizationId;
    userId: UserId;
    scope: string | null;
    spaceId: SpaceId | null;
  }) {
    return this._createStandard.execute({
      ...params,
      organizationId: params.organizationId.toString(),
      userId: params.userId.toString(),
      spaceId: params.spaceId?.toString() || '',
    });
  }

  /**
   * Create a new standard with rules and examples in a single operation
   */
  public async createStandardWithExamples(params: {
    name: string;
    description: string;
    summary: string | null;
    rules: import('@packmind/types').RuleWithExamples[];
    organizationId: OrganizationId;
    userId: UserId;
    scope: string | null;
    spaceId: SpaceId | null;
  }) {
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

  /**
   * Update an existing standard with new content
   */
  public async updateStandard(command: UpdateStandardCommand) {
    const result = await this._updateStandard.execute(command);
    return result.standard;
  }

  /**
   * Add a new rule to an existing standard
   */
  public async addRuleToStandard(params: {
    standardSlug: string;
    ruleContent: string;
    organizationId: OrganizationId;
    userId: UserId;
  }) {
    return this._addRuleToStandard.addRuleToStandard(params);
  }

  /**
   * Create a new example for a rule
   */
  public async createRuleExample(
    command: CreateRuleExampleCommand,
  ): Promise<RuleExample> {
    return this._createRuleExample.execute(command);
  }

  /**
   * Get all examples for a rule
   */
  public async getRuleExamples(
    command: GetRuleExamplesCommand,
  ): Promise<RuleExample[]> {
    return this._getRuleExamples.getRuleExamples(command);
  }

  /**
   * Update an existing rule example
   */
  public async updateRuleExample(
    command: UpdateRuleExampleCommand,
  ): Promise<RuleExample> {
    return this._updateRuleExample.execute(command);
  }

  /**
   * Delete a rule example
   */
  public async deleteRuleExample(
    command: DeleteRuleExampleCommand,
  ): Promise<void> {
    return this._deleteRuleExample.execute(command);
  }

  // ===========================
  // READ OPERATIONS (Now delegating to proper use cases)
  // ===========================

  public async listStandardsBySpace(
    command: ListStandardsBySpaceCommand,
  ): Promise<ListStandardsBySpaceResponse> {
    return this._listStandardsBySpace.execute(command);
  }

  public async getStandardById(
    command: GetStandardByIdCommand,
  ): Promise<GetStandardByIdResponse> {
    return this._getStandardById.execute(command);
  }

  public async findStandardBySlug(
    slug: string,
    organizationId: OrganizationId,
  ) {
    return this._findStandardBySlug.findStandardBySlug(slug, organizationId);
  }

  public async listStandardVersions(standardId: StandardId) {
    return this._listStandardVersions.listStandardVersions(standardId);
  }

  public async getStandardVersion(standardId: StandardId, version: number) {
    return this._getStandardVersion.getStandardVersion(standardId, version);
  }

  public async getLatestStandardVersion(standardId: StandardId) {
    return this._getLatestStandardVersion.getLatestStandardVersion(standardId);
  }

  public async getStandardVersionById(versionId: StandardVersionId) {
    return this._getStandardVersionById.getStandardVersionById(versionId);
  }

  public async getRulesByStandardId(standardId: StandardId) {
    return this._getRulesByStandardId.getRulesByStandardId(standardId);
  }

  public async deleteStandard(
    standardId: StandardId,
    userId: UserId,
  ): Promise<void> {
    return this._deleteStandard.deleteStandard(standardId, userId);
  }

  public async deleteStandardsBatch(
    standardIds: StandardId[],
    userId: UserId,
  ): Promise<void> {
    return this._deleteStandardsBatch.deleteStandardsBatch(standardIds, userId);
  }
}
