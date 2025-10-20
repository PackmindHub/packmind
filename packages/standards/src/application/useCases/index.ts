import { PackmindLogger, RuleId } from '@packmind/shared';
import { CreateStandardUsecase } from './createStandard/createStandard.usecase';
import { CreateStandardWithExamplesUsecase } from './createStandardWithExamples/createStandardWithExamples.usecase';
import { UpdateStandardUsecase } from './updateStandard/updateStandard.usecase';
import { AddRuleToStandardUsecase } from './addRuleToStandard/addRuleToStandard.usecase';
import { GetStandardByIdUsecase } from './getStandardById/getStandardById.usecase';
import { ListStandardsByOrganizationUsecase } from './listStandardsByOrganization/listStandardsByOrganization.usecase';
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
import { GitHexa } from '@packmind/git';
import { Standard, StandardId } from '../../domain/entities';
import { RuleExample } from '../../domain/entities';
import { StandardVersionId } from '../../domain/entities';
import {
  CreateRuleExampleCommand,
  GetRuleExamplesCommand,
  UpdateRuleExampleCommand,
  DeleteRuleExampleCommand,
} from '../../domain/useCases';
import { IDeploymentPort } from '@packmind/shared';
import { IStandardDelayedJobs } from '../../domain/jobs/IStandardDelayedJobs';

const origin = 'StandardsUseCases';

export class StandardsUseCases {
  private readonly _createStandard: CreateStandardUsecase;
  private readonly _createStandardWithExamples: CreateStandardWithExamplesUsecase;
  private readonly _updateStandard: UpdateStandardUsecase;
  private readonly _addRuleToStandard: AddRuleToStandardUsecase;
  private readonly _getStandardById: GetStandardByIdUsecase;
  private readonly _findStandardBySlug: FindStandardBySlugUsecase;
  private readonly _listStandardsByOrganization: ListStandardsByOrganizationUsecase;
  private readonly _listStandardVersions: ListStandardVersionsUsecase;
  private readonly _getStandardVersion: GetStandardVersionUsecase;
  private readonly _getLatestStandardVersion: GetLatestStandardVersionUsecase;
  private readonly _getStandardVersionById: GetStandardVersionByIdUsecase;
  private readonly _getRulesByStandardId: GetRulesByStandardIdUsecase;
  private readonly _deleteStandard: DeleteStandardUsecase;
  private readonly _deleteStandardsBatch: DeleteStandardsBatchUsecase;
  private readonly _createRuleExample: CreateRuleExampleUsecase;
  private readonly _getRuleExamples: GetRuleExamplesUsecase;
  private readonly _updateRuleExample: UpdateRuleExampleUsecase;
  private readonly _deleteRuleExample: DeleteRuleExampleUsecase;

  constructor(
    private readonly standardsServices: IStandardsServices,
    private readonly standardsRepositories: IStandardsRepositories,
    private readonly gitHexa: GitHexa,
    private deploymentsQueryAdapter: IDeploymentPort | undefined,
    private standardDelayedJobs: IStandardDelayedJobs,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this._createStandard = new CreateStandardUsecase(
      standardsServices.getStandardService(),
      standardsServices.getStandardVersionService(),
      standardDelayedJobs.standardSummaryDelayedJob,
      this.logger,
    );
    this._createStandardWithExamples = new CreateStandardWithExamplesUsecase(
      standardsServices.getStandardService(),
      standardsServices.getStandardVersionService(),
      standardsServices.getStandardSummaryService(),
      standardsRepositories.getRuleExampleRepository(),
      this.logger,
    );
    this._updateStandard = new UpdateStandardUsecase(
      standardsServices.getStandardService(),
      standardsServices.getStandardVersionService(),
      standardsRepositories.getRuleRepository(),
      standardsRepositories.getRuleExampleRepository(),
      this.standardDelayedJobs.standardSummaryDelayedJob,
      this.logger,
    );
    this._addRuleToStandard = new AddRuleToStandardUsecase(
      standardsServices.getStandardService(),
      standardsServices.getStandardVersionService(),
      standardsRepositories.getRuleRepository(),
      standardsRepositories.getRuleExampleRepository(),
      this.standardDelayedJobs.standardSummaryDelayedJob,
      this.logger,
    );
    this._getStandardById = new GetStandardByIdUsecase(
      standardsServices.getStandardService(),
      this.logger,
    );
    this._findStandardBySlug = new FindStandardBySlugUsecase(
      standardsServices.getStandardService(),
      this.logger,
    );
    this._listStandardsByOrganization = new ListStandardsByOrganizationUsecase(
      standardsServices.getStandardService(),
      this.logger,
    );
    this._listStandardVersions = new ListStandardVersionsUsecase(
      standardsServices.getStandardVersionService(),
      this.logger,
    );
    this._getStandardVersion = new GetStandardVersionUsecase(
      standardsServices.getStandardVersionService(),
      this.logger,
    );
    this._getLatestStandardVersion = new GetLatestStandardVersionUsecase(
      standardsServices.getStandardVersionService(),
      this.logger,
    );
    this._getStandardVersionById = new GetStandardVersionByIdUsecase(
      standardsServices.getStandardVersionService(),
      this.logger,
    );
    this._getRulesByStandardId = new GetRulesByStandardIdUsecase(
      standardsServices.getStandardVersionService(),
      this.logger,
    );
    this._deleteStandard = new DeleteStandardUsecase(
      standardsServices.getStandardService(),
      this.logger,
    );
    this._deleteStandardsBatch = new DeleteStandardsBatchUsecase(
      standardsServices.getStandardService(),
      this.logger,
    );
    this._createRuleExample = new CreateRuleExampleUsecase(
      standardsRepositories.getRuleExampleRepository(),
      standardsRepositories.getRuleRepository(),
      this.logger,
    );
    this._getRuleExamples = new GetRuleExamplesUsecase(
      standardsRepositories.getRuleExampleRepository(),
      standardsRepositories.getRuleRepository(),
      this.logger,
    );
    this._updateRuleExample = new UpdateRuleExampleUsecase(
      standardsRepositories,
      this.logger,
    );
    this._deleteRuleExample = new DeleteRuleExampleUsecase(
      standardsRepositories,
      this.logger,
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
  }) {
    return this._createStandard.createStandard(params);
  }

  /**
   * Create a new standard with rules and examples in a single operation
   */
  public async createStandardWithExamples(params: {
    name: string;
    description: string;
    summary: string | null;
    rules: import('@packmind/shared').RuleWithExamples[];
    organizationId: OrganizationId;
    userId: UserId;
    scope: string | null;
  }) {
    return this._createStandardWithExamples.createStandardWithExamples(params);
  }

  /**
   * Update an existing standard with new content
   */
  public async updateStandard(params: {
    standardId: StandardId;
    name: string;
    description: string;
    rules: Array<{ id: RuleId; content: string }>;
    organizationId: OrganizationId;
    userId: UserId;
    scope: string | null;
  }) {
    return this._updateStandard.updateStandard(params);
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
    return this._createRuleExample.createRuleExample(command);
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

  public async listStandardsByOrganization(
    organizationId: OrganizationId,
  ): Promise<Standard[]> {
    return this._listStandardsByOrganization.listStandardsByOrganization(
      organizationId,
    );
  }

  public async getStandardById(id: StandardId) {
    return this._getStandardById.getStandardById(id);
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
