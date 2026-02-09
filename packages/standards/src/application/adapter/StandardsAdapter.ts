import { PackmindLogger } from '@packmind/logger';
import {
  IBaseAdapter,
  JobsService,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  AddRuleToStandardCommand,
  AddRuleToStandardResponse,
  CreateRuleExampleCommand,
  CreateStandardCommand,
  CreateStandardSamplesCommand,
  CreateStandardSamplesResponse,
  DeleteRuleExampleCommand,
  DeleteRuleExampleResponse,
  DeleteStandardCommand,
  DeleteStandardsBatchCommand,
  GetStandardByIdResponse,
  IAccountsPort,
  IAccountsPortName,
  IDeploymentPort,
  IDeploymentPortName,
  ILinterPort,
  ILinterPortName,
  ILlmPort,
  ILlmPortName,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPort,
  ListStandardsBySpaceCommand,
  OrganizationId,
  PackmindEventSource,
  QueryOption,
  Rule,
  RuleExample,
  RuleId,
  SpaceId,
  Standard,
  StandardCreationMethod,
  StandardId,
  StandardVersion,
  StandardVersionId,
  UpdateRuleExampleCommand,
  UpdateStandardCommand,
  UserId,
} from '@packmind/types';
import { IStandardDelayedJobs } from '../../domain/jobs/IStandardDelayedJobs';
import { IStandardsRepositories } from '../../domain/repositories/IStandardsRepositories';
import { GetRuleExamplesCommand } from '../../domain/useCases';
import { GenerateStandardSummaryJobFactory } from '../../infra/jobs/GenerateStandardSummaryJobFactory';
import { StandardsServices } from '../services/StandardsServices';
import { AddRuleToStandardUsecase } from '../useCases/addRuleToStandard/addRuleToStandard.usecase';
import { CreateRuleExampleUsecase } from '../useCases/createRuleExample/createRuleExample.usecase';
import { CreateStandardUsecase } from '../useCases/createStandard/createStandard.usecase';
import { CreateStandardSamplesUsecase } from '../useCases/createStandardSamples/createStandardSamples.usecase';
import { CreateStandardWithExamplesUsecase } from '../useCases/createStandardWithExamples/createStandardWithExamples.usecase';
import { CreateStandardWithPackagesUsecase } from '../useCases/createStandardWithPackages/createStandardWithPackages.usecase';
import { DeleteRuleExampleUsecase } from '../useCases/deleteRuleExample/deleteRuleExample.usecase';
import { DeleteStandardUsecase } from '../useCases/deleteStandard/deleteStandard.usecase';
import { DeleteStandardsBatchUsecase } from '../useCases/deleteStandardsBatch/deleteStandardsBatch.usecase';
import { FindStandardBySlugUsecase } from '../useCases/findStandardBySlug/findStandardBySlug.usecase';
import { GetLatestStandardVersionUsecase } from '../useCases/getLatestStandardVersion/getLatestStandardVersion.usecase';
import { GetRuleExamplesUsecase } from '../useCases/getRuleExamples/getRuleExamples.usecase';
import { GetRulesByStandardIdUsecase } from '../useCases/getRulesByStandardId/getRulesByStandardId.usecase';
import { GetStandardByIdUsecase } from '../useCases/getStandardById/getStandardById.usecase';
import { GetStandardVersionUsecase } from '../useCases/getStandardVersion/getStandardVersion.usecase';
import { GetStandardVersionByIdUsecase } from '../useCases/getStandardVersionById/getStandardVersionById.usecase';
import { ListStandardsBySpaceUsecase } from '../useCases/listStandardsBySpace/listStandardsBySpace.usecase';
import { ListStandardVersionsUsecase } from '../useCases/listStandardVersions/listStandardVersions.usecase';
import { UpdateRuleExampleUsecase } from '../useCases/updateRuleExample/updateRuleExample.usecase';
import { UpdateStandardUsecase } from '../useCases/updateStandard/updateStandard.usecase';

const origin = 'StandardsAdapter';

export class StandardsAdapter
  implements IBaseAdapter<IStandardsPort>, IStandardsPort
{
  private standardDelayedJobs: IStandardDelayedJobs | null = null;
  private accountsPort: IAccountsPort | null = null;
  private spacesPort: ISpacesPort | null = null;
  private linterPort: ILinterPort | null = null;
  private deploymentsPort: IDeploymentPort | null = null;
  private llmPort: ILlmPort | null = null;
  private eventEmitterService: PackmindEventEmitterService | null = null;

  // Use cases - all initialized in initialize()
  private _createStandard!: CreateStandardUsecase;
  private _createStandardWithExamples!: CreateStandardWithExamplesUsecase;
  private _createStandardSamples!: CreateStandardSamplesUsecase;
  private _createStandardWithPackages!: CreateStandardWithPackagesUsecase;
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
    private readonly services: StandardsServices,
    private readonly repositories: IStandardsRepositories,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
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
    [ILlmPortName]: ILlmPort;
    jobsService: JobsService;
    eventEmitterService: PackmindEventEmitterService;
  }): Promise<void> {
    this.logger.info('Initializing StandardsAdapter with ports and services');

    this.accountsPort = ports[IAccountsPortName];
    this.spacesPort = ports[ISpacesPortName];
    this.linterPort = ports[ILinterPortName];
    this.deploymentsPort = ports[IDeploymentPortName];
    this.llmPort = ports[ILlmPortName];
    this.eventEmitterService = ports.eventEmitterService;

    this.standardDelayedJobs = await this.buildDelayedJobs(ports.jobsService);

    // Set llmPort to services
    if (this.llmPort) {
      this.services.setLlmPort(this.llmPort);
    }

    if (
      !this.accountsPort ||
      !this.spacesPort ||
      !this.linterPort ||
      !this.deploymentsPort ||
      !this.llmPort ||
      !this.standardDelayedJobs ||
      !this.eventEmitterService
    ) {
      throw new Error(
        'StandardsAdapter: Required ports/services not provided. Ensure JobsService and PackmindEventEmitterService are passed to initialize().',
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
      this.accountsPort,
      this.services.getStandardService(),
      this.eventEmitterService,
    );

    this._deleteStandardsBatch = new DeleteStandardsBatchUsecase(
      this.accountsPort,
      this.services.getStandardService(),
      this.eventEmitterService,
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
      this.accountsPort,
      this.services.getStandardService(),
      this.services.getStandardVersionService(),
      this.standardDelayedJobs.standardSummaryDelayedJob,
      this.eventEmitterService,
      this.repositories.getRuleRepository(),
    );

    this._updateStandard = new UpdateStandardUsecase(
      this.accountsPort,
      this.services.getStandardService(),
      this.services.getStandardVersionService(),
      this.repositories.getRuleRepository(),
      this.repositories.getRuleExampleRepository(),
      this.standardDelayedJobs.standardSummaryDelayedJob,
      this.spacesPort,
      this.eventEmitterService,
    );

    this._addRuleToStandard = new AddRuleToStandardUsecase(
      this.accountsPort,
      this.services.getStandardService(),
      this.services.getStandardVersionService(),
      this.repositories.getRuleRepository(),
      this.repositories.getRuleExampleRepository(),
      this.standardDelayedJobs.standardSummaryDelayedJob,
      this.eventEmitterService,
      this.linterPort,
    );

    // Use cases that depend on linterPort
    this._createStandardWithExamples = new CreateStandardWithExamplesUsecase(
      this.services.getStandardService(),
      this.services.getStandardVersionService(),
      this.services.getStandardSummaryService(),
      this.repositories.getRuleExampleRepository(),
      this.repositories.getRuleRepository(),
      this.eventEmitterService,
      this.linterPort,
    );

    this._createStandardSamples = new CreateStandardSamplesUsecase(
      this.accountsPort,
      this,
      this.eventEmitterService,
    );

    // Use case that depends on accountsPort, deploymentsPort, and spacesPort
    this._createStandardWithPackages = new CreateStandardWithPackagesUsecase(
      this.accountsPort,
      this._createStandardWithExamples,
      this.deploymentsPort,
      this.spacesPort,
    );

    this._createRuleExample = new CreateRuleExampleUsecase(
      this.accountsPort,
      this.repositories.getRuleExampleRepository(),
      this.repositories.getRuleRepository(),
      this.repositories.getStandardVersionRepository(),
      this.eventEmitterService,
      this.linterPort,
    );

    this._updateRuleExample = new UpdateRuleExampleUsecase(
      this.accountsPort,
      this.repositories,
      this.eventEmitterService,
      this.linterPort,
    );

    this._deleteRuleExample = new DeleteRuleExampleUsecase(
      this.accountsPort,
      this.repositories,
      this.eventEmitterService,
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
      this.repositories,
      this.services.getStandardSummaryService(),
      this.services.getStandardVersionService(),
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
      this.accountsPort != null &&
      this.spacesPort != null &&
      this.linterPort != null &&
      this.deploymentsPort != null &&
      this.standardDelayedJobs != null
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
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Standard[]> {
    const command: ListStandardsBySpaceCommand = {
      userId,
      organizationId,
      spaceId,
      includeDeleted: opts?.includeDeleted,
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

  async createStandard(params: CreateStandardCommand): Promise<Standard> {
    const result = await this._createStandard.execute({
      ...params,
      userId: params.userId.toString(),
    });
    return result.standard;
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
    disableTriggerAssessment?: boolean;
    source?: PackmindEventSource;
    method?: StandardCreationMethod;
    originSkill?: string;
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

  async createStandardWithPackages(params: {
    name: string;
    description: string;
    summary?: string;
    scope?: string | null;
    rules: import('@packmind/types').RuleWithExamples[];
    organizationId: OrganizationId;
    userId: UserId;
    spaceId: SpaceId;
    packageSlugs?: string[];
    source?: PackmindEventSource;
    method?: StandardCreationMethod;
  }): Promise<Standard> {
    const result = await this._createStandardWithPackages.execute({
      ...params,
      userId: params.userId.toString(),
      organizationId: params.organizationId.toString(),
    });
    return result.standard;
  }

  async addRuleToStandard(
    command: AddRuleToStandardCommand,
  ): Promise<AddRuleToStandardResponse> {
    return this._addRuleToStandard.execute(command);
  }

  async getStandardById(command: {
    standardId: StandardId;
    organizationId: OrganizationId;
    spaceId: SpaceId;
    userId: string;
  }): Promise<GetStandardByIdResponse> {
    return this._getStandardById.execute(command);
  }

  async deleteStandard(command: DeleteStandardCommand): Promise<void> {
    await this._deleteStandard.execute(command);
  }

  async updateStandard(command: UpdateStandardCommand): Promise<Standard> {
    const result = await this._updateStandard.execute(command);
    return result.standard;
  }

  async deleteStandardsBatch(
    command: DeleteStandardsBatchCommand,
  ): Promise<void> {
    await this._deleteStandardsBatch.execute(command);
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

  async deleteRuleExample(
    command: DeleteRuleExampleCommand,
  ): Promise<DeleteRuleExampleResponse> {
    return this._deleteRuleExample.execute(command);
  }

  async createStandardSamples(
    command: CreateStandardSamplesCommand,
  ): Promise<CreateStandardSamplesResponse> {
    return this._createStandardSamples.execute(command);
  }
}
