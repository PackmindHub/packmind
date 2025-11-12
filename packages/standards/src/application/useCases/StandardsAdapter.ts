import { IBaseAdapter, JobsService } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import {
  IAccountsPort,
  IAccountsPortName,
  IDeploymentPort,
  IDeploymentPortName,
  ILinterPort,
  ILinterPortName,
  ISpacesPort,
  ISpacesPortName,
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
import { GenerateStandardSummaryJobFactory } from '../../infra/jobs/GenerateStandardSummaryJobFactory';

const origin = 'StandardsAdapter';

export class StandardsAdapter
  implements IBaseAdapter<IStandardsPort>, IStandardsPort
{
  private readonly services: StandardsServices;
  private readonly repositories: IStandardsRepositories;
  private readonly logger: PackmindLogger;
  private standardDelayedJobs!: IStandardDelayedJobs;
  private accountsPort!: IAccountsPort;
  private spacesPort!: ISpacesPort;
  private linterPort!: ILinterPort;
  private deploymentsPort!: IDeploymentPort;

  // Use cases - all initialized in initialize()
  private _createStandard!: CreateStandardUsecase;
  private _createStandardWithExamples!: CreateStandardWithExamplesUsecase;
  private _updateStandard!: UpdateStandardUsecase;
  private _addRuleToStandard!: AddRuleToStandardUsecase;
  private _getStandardById!: GetStandardByIdUsecase;
  private _findStandardBySlug!: FindStandardBySlugUsecase;
  private _listStandardsBySpace!: ListStandardsBySpaceUsecase;
  private _listStandardVersions!: ListStandardVersionsUsecase;
  private _getStandardVersion!: GetStandardVersionUsecase;
  private _getLatestStandardVersion!: GetLatestStandardVersionUsecase;
  private _getStandardVersionById!: GetStandardVersionByIdUsecase;
  private _getRulesByStandardId!: GetRulesByStandardIdUsecase;
  private _deleteStandard!: DeleteStandardUsecase;
  private _deleteStandardsBatch!: DeleteStandardsBatchUsecase;
  private _createRuleExample!: CreateRuleExampleUsecase;
  private _getRuleExamples!: GetRuleExamplesUsecase;
  private _updateRuleExample!: UpdateRuleExampleUsecase;
  private _deleteRuleExample!: DeleteRuleExampleUsecase;

  constructor(
    services: StandardsServices,
    repositories: IStandardsRepositories,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.services = services;
    this.repositories = repositories;
    this.logger = logger;

    this.logger.info(
      'StandardsAdapter constructed - awaiting initialization with ports',
    );
  }

  /**
   * Initialize adapter with ports and services from registry.
   * All use cases are created here with non-null dependencies.
   * Delayed jobs are built internally from JobsService.
   */
  public async initialize(ports: {
    [IAccountsPortName]: IAccountsPort;
    [ISpacesPortName]: ISpacesPort;
    [ILinterPortName]: ILinterPort;
    [IDeploymentPortName]: IDeploymentPort;
    jobsService?: JobsService;
  }): Promise<void> {
    this.logger.info('Initializing StandardsAdapter with ports and services');

    // Step 1: Set all ports (all are required)
    this.accountsPort = ports[IAccountsPortName];
    this.spacesPort = ports[ISpacesPortName];
    this.linterPort = ports[ILinterPortName];
    this.deploymentsPort = ports[IDeploymentPortName];

    // Step 2: Build delayed jobs from JobsService if provided
    if (ports.jobsService) {
      this.standardDelayedJobs = await this.buildDelayedJobs(ports.jobsService);
    }

    // Step 3: Validate required ports and services
    if (!this.isReady()) {
      throw new Error(
        'StandardsAdapter: Required ports/services not provided. Ensure JobsService is passed to initialize().',
      );
    }

    // Step 4: Create ALL use cases with non-null ports
    // At this point, we know standardDelayedJobs is not null due to isReady() check
    // Use cases that don't depend on external ports
    this._listStandardVersions = new ListStandardVersionsUsecase(
      this.services.getStandardVersionService(),
    );

    this._getStandardVersion = new GetStandardVersionUsecase(
      this.services.getStandardVersionService(),
    );

    this._getLatestStandardVersion = new GetLatestStandardVersionUsecase(
      this.services.getStandardVersionService(),
    );

    this._getStandardVersionById = new GetStandardVersionByIdUsecase(
      this.services.getStandardVersionService(),
    );

    this._getRulesByStandardId = new GetRulesByStandardIdUsecase(
      this.services.getStandardVersionService(),
    );

    this._deleteStandard = new DeleteStandardUsecase(
      this.services.getStandardService(),
    );

    this._deleteStandardsBatch = new DeleteStandardsBatchUsecase(
      this.services.getStandardService(),
    );

    this._findStandardBySlug = new FindStandardBySlugUsecase(
      this.services.getStandardService(),
    );

    this._getRuleExamples = new GetRuleExamplesUsecase(
      this.repositories.getRuleExampleRepository(),
      this.repositories.getRuleRepository(),
    );

    // Use cases that depend on accountsPort (required)
    this._getStandardById = new GetStandardByIdUsecase(
      this.accountsPort,
      this.services.getStandardService(),
      this.spacesPort,
    );

    this._listStandardsBySpace = new ListStandardsBySpaceUsecase(
      this.accountsPort,
      this.services.getStandardService(),
      this.spacesPort,
    );

    // Use cases that depend on delayed jobs (required)
    this._createStandard = new CreateStandardUsecase(
      this.services.getStandardService(),
      this.services.getStandardVersionService(),
      this.standardDelayedJobs.standardSummaryDelayedJob,
    );

    this._updateStandard = new UpdateStandardUsecase(
      this.accountsPort,
      this.services.getStandardService(),
      this.services.getStandardVersionService(),
      this.repositories.getRuleRepository(),
      this.repositories.getRuleExampleRepository(),
      this.standardDelayedJobs.standardSummaryDelayedJob,
      this.spacesPort,
    );

    this._addRuleToStandard = new AddRuleToStandardUsecase(
      this.services.getStandardService(),
      this.services.getStandardVersionService(),
      this.repositories.getRuleRepository(),
      this.repositories.getRuleExampleRepository(),
      this.standardDelayedJobs.standardSummaryDelayedJob,
      this.linterPort,
    );

    // Use cases that depend on linterPort
    this._createStandardWithExamples = new CreateStandardWithExamplesUsecase(
      this.services.getStandardService(),
      this.services.getStandardVersionService(),
      this.services.getStandardSummaryService(),
      this.repositories.getRuleExampleRepository(),
      this.repositories.getRuleRepository(),
      this.linterPort,
    );

    this._createRuleExample = new CreateRuleExampleUsecase(
      this.repositories.getRuleExampleRepository(),
      this.repositories.getRuleRepository(),
      this.linterPort,
    );

    this._updateRuleExample = new UpdateRuleExampleUsecase(
      this.repositories,
      this.linterPort,
    );

    this._deleteRuleExample = new DeleteRuleExampleUsecase(
      this.repositories,
      this.linterPort,
    );

    this.logger.info(
      'StandardsAdapter initialized successfully with all use cases',
    );
  }

  /**
   * Build delayed jobs from JobsService.
   * This is called internally during initialize().
   */
  private async buildDelayedJobs(
    jobsService: JobsService,
  ): Promise<IStandardDelayedJobs> {
    this.logger.debug('Building standards delayed jobs');

    const jobFactory = new GenerateStandardSummaryJobFactory(
      this.logger,
      this.repositories,
    );

    jobsService.registerJobQueue(jobFactory.getQueueName(), jobFactory);

    await jobFactory.createQueue();

    if (!jobFactory.delayedJob) {
      throw new Error(
        'StandardsAdapter: Failed to create delayed job for standard summary',
      );
    }

    this.logger.debug('Standards delayed jobs built successfully');
    return {
      standardSummaryDelayedJob: jobFactory.delayedJob,
    };
  }

  /**
   * Check if adapter is ready (all required ports and services set).
   */
  public isReady(): boolean {
    return (
      this.accountsPort !== undefined &&
      this.spacesPort !== undefined &&
      this.linterPort !== undefined &&
      this.deploymentsPort !== undefined &&
      this.standardDelayedJobs !== undefined
    );
  }

  /**
   * Get the port interface this adapter implements.
   */
  public getPort(): IStandardsPort {
    return this as IStandardsPort;
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
