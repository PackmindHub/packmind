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
  DuplicateStandardResult,
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
import { IStandardsRepositories } from '../../domain/repositories/IStandardsRepositories';
import { GetRuleExamplesCommand } from '../../domain/useCases';
import { StandardsServices } from '../services/StandardsServices';
import { AddRuleToStandardUseCase } from '../useCases/addRuleToStandard/AddRuleToStandardUseCase';
import { CreateRuleExampleUseCase } from '../useCases/createRuleExample/CreateRuleExampleUseCase';
import { CreateStandardUseCase } from '../useCases/createStandard/CreateStandardUseCase';
import { CreateStandardSamplesUseCase } from '../useCases/createStandardSamples/CreateStandardSamplesUseCase';
import { CreateStandardWithExamplesUseCase } from '../useCases/createStandardWithExamples/CreateStandardWithExamplesUseCase';
import { CreateStandardWithPackagesUseCase } from '../useCases/createStandardWithPackages/CreateStandardWithPackagesUseCase';
import { DeleteRuleExampleUseCase } from '../useCases/deleteRuleExample/DeleteRuleExampleUseCase';
import { DeleteStandardUseCase } from '../useCases/deleteStandard/DeleteStandardUseCase';
import { DeleteStandardsBatchUseCase } from '../useCases/deleteStandardsBatch/DeleteStandardsBatchUseCase';
import { FindStandardBySlugUseCase } from '../useCases/findStandardBySlug/FindStandardBySlugUseCase';
import { GetLatestStandardVersionUseCase } from '../useCases/getLatestStandardVersion/GetLatestStandardVersionUseCase';
import { GetRuleExamplesUseCase } from '../useCases/getRuleExamples/GetRuleExamplesUseCase';
import { GetRulesByStandardIdUseCase } from '../useCases/getRulesByStandardId/GetRulesByStandardIdUseCase';
import { GetStandardByIdUseCase } from '../useCases/getStandardById/GetStandardByIdUseCase';
import { GetStandardVersionUseCase } from '../useCases/getStandardVersion/GetStandardVersionUseCase';
import { GetStandardVersionByIdUseCase } from '../useCases/getStandardVersionById/GetStandardVersionByIdUseCase';
import { ListStandardsBySpaceUseCase } from '../useCases/listStandardsBySpace/ListStandardsBySpaceUseCase';
import { ListStandardVersionsUseCase } from '../useCases/listStandardVersions/ListStandardVersionsUseCase';
import { UpdateRuleExampleUseCase } from '../useCases/updateRuleExample/UpdateRuleExampleUseCase';
import { UpdateStandardUseCase } from '../useCases/updateStandard/UpdateStandardUseCase';

const origin = 'StandardsAdapter';

export class StandardsAdapter
  implements IBaseAdapter<IStandardsPort>, IStandardsPort
{
  private accountsPort: IAccountsPort | null = null;
  private spacesPort: ISpacesPort | null = null;
  private linterPort: ILinterPort | null = null;
  private deploymentsPort: IDeploymentPort | null = null;
  private llmPort: ILlmPort | null = null;
  private eventEmitterService: PackmindEventEmitterService | null = null;

  // Use cases - all initialized in initialize()
  private _createStandard!: CreateStandardUseCase;
  private _createStandardWithExamples!: CreateStandardWithExamplesUseCase;
  private _createStandardSamples!: CreateStandardSamplesUseCase;
  private _createStandardWithPackages!: CreateStandardWithPackagesUseCase;
  private _updateStandard!: UpdateStandardUseCase;
  private _addRuleToStandard!: AddRuleToStandardUseCase;
  private _getStandardById!: GetStandardByIdUseCase;
  private _findStandardBySlug!: FindStandardBySlugUseCase;
  private _listStandardsBySpace!: ListStandardsBySpaceUseCase;
  private _listStandardVersions!: ListStandardVersionsUseCase;
  private _getStandardVersion!: GetStandardVersionUseCase;
  private _getLatestStandardVersion!: GetLatestStandardVersionUseCase;
  private _getStandardVersionById!: GetStandardVersionByIdUseCase;
  private _getRulesByStandardId!: GetRulesByStandardIdUseCase;
  private _deleteStandard!: DeleteStandardUseCase;
  private _deleteStandardsBatch!: DeleteStandardsBatchUseCase;
  private _createRuleExample!: CreateRuleExampleUseCase;
  private _getRuleExamples!: GetRuleExamplesUseCase;
  private _updateRuleExample!: UpdateRuleExampleUseCase;
  private _deleteRuleExample!: DeleteRuleExampleUseCase;

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

    if (
      !this.accountsPort ||
      !this.spacesPort ||
      !this.linterPort ||
      !this.deploymentsPort ||
      !this.llmPort ||
      !this.eventEmitterService
    ) {
      throw new Error(
        'StandardsAdapter: Required ports/services not provided. Ensure JobsService and PackmindEventEmitterService are passed to initialize().',
      );
    }

    // Step 4: Create ALL use cases with non-null ports
    // At this point, we know standardDelayedJobs is not null due to isReady() check
    // Use cases that don't depend on external ports
    this._listStandardVersions = new ListStandardVersionsUseCase(
      this.services.getStandardVersionService(),
    );

    this._getStandardVersion = new GetStandardVersionUseCase(
      this.services.getStandardVersionService(),
    );

    this._getLatestStandardVersion = new GetLatestStandardVersionUseCase(
      this.services.getStandardVersionService(),
    );

    this._getStandardVersionById = new GetStandardVersionByIdUseCase(
      this.services.getStandardVersionService(),
    );

    this._getRulesByStandardId = new GetRulesByStandardIdUseCase(
      this.services.getStandardVersionService(),
    );

    this._deleteStandard = new DeleteStandardUseCase(
      this.spacesPort,
      this.accountsPort,
      this.services.getStandardService(),
      this.eventEmitterService,
    );

    this._deleteStandardsBatch = new DeleteStandardsBatchUseCase(
      this.spacesPort,
      this.accountsPort,
      this.services.getStandardService(),
      this.eventEmitterService,
    );

    this._findStandardBySlug = new FindStandardBySlugUseCase(
      this.services.getStandardService(),
    );

    this._getRuleExamples = new GetRuleExamplesUseCase(
      this.repositories.getRuleExampleRepository(),
      this.repositories.getRuleRepository(),
    );

    // Use cases that depend on accountsPort (required)
    this._getStandardById = new GetStandardByIdUseCase(
      this.spacesPort,
      this.accountsPort,
      this.services.getStandardService(),
    );

    this._listStandardsBySpace = new ListStandardsBySpaceUseCase(
      this.spacesPort,
      this.accountsPort,
      this.services.getStandardService(),
    );

    this._createStandard = new CreateStandardUseCase(
      this.spacesPort,
      this.accountsPort,
      this.services.getStandardService(),
      this.services.getStandardVersionService(),
      this.eventEmitterService,
      this.repositories.getRuleRepository(),
    );

    this._updateStandard = new UpdateStandardUseCase(
      this.spacesPort,
      this.accountsPort,
      this.services.getStandardService(),
      this.services.getStandardVersionService(),
      this.repositories.getRuleRepository(),
      this.repositories.getRuleExampleRepository(),
      this.eventEmitterService,
    );

    this._addRuleToStandard = new AddRuleToStandardUseCase(
      this.spacesPort,
      this.accountsPort,
      this.services.getStandardService(),
      this.services.getStandardVersionService(),
      this.repositories.getRuleRepository(),
      this.repositories.getRuleExampleRepository(),
      this.eventEmitterService,
      this.linterPort,
    );

    // Use cases that depend on linterPort
    this._createStandardWithExamples = new CreateStandardWithExamplesUseCase(
      this.services.getStandardService(),
      this.services.getStandardVersionService(),
      this.repositories.getRuleExampleRepository(),
      this.repositories.getRuleRepository(),
      this.eventEmitterService,
      this.linterPort,
    );

    this._createStandardSamples = new CreateStandardSamplesUseCase(
      this.spacesPort,
      this.accountsPort,
      this,
      this.eventEmitterService,
    );

    // Use case that depends on accountsPort, deploymentsPort, and spacesPort
    this._createStandardWithPackages = new CreateStandardWithPackagesUseCase(
      this.spacesPort,
      this.accountsPort,
      this._createStandardWithExamples,
      this.deploymentsPort,
    );

    this._createRuleExample = new CreateRuleExampleUseCase(
      this.spacesPort,
      this.accountsPort,
      this.repositories.getRuleExampleRepository(),
      this.repositories.getRuleRepository(),
      this.repositories.getStandardVersionRepository(),
      this.eventEmitterService,
      this.linterPort,
    );

    this._updateRuleExample = new UpdateRuleExampleUseCase(
      this.spacesPort,
      this.accountsPort,
      this.repositories,
      this.eventEmitterService,
      this.linterPort,
    );

    this._deleteRuleExample = new DeleteRuleExampleUseCase(
      this.spacesPort,
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
   * Check if adapter is ready (all required ports and services set).
   */
  public isReady(): boolean {
    return (
      this.accountsPort != null &&
      this.spacesPort != null &&
      this.linterPort != null &&
      this.deploymentsPort != null
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

  getRulesByVersionId(versionId: StandardVersionId): Promise<Rule[]> {
    return this.services
      .getStandardVersionService()
      .getRulesByVersionId(versionId);
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

  getStandardVersionByNumber(
    standardId: StandardId,
    version: number,
    allowedSpaceIds: SpaceId[],
  ): Promise<StandardVersion | null> {
    return this._getStandardVersion.getStandardVersion(
      standardId,
      version,
      allowedSpaceIds,
    );
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

  async listAllStandardsByOrganization(
    organizationId: OrganizationId,
  ): Promise<Standard[]> {
    if (!this.spacesPort) {
      this.logger.warn('SpacesPort not available, returning empty results');
      return [];
    }

    const spaces =
      await this.spacesPort.listSpacesByOrganization(organizationId);
    const standardsPerSpace = await Promise.all(
      spaces.map((space) =>
        this.services.getStandardService().listStandardsBySpace(space.id),
      ),
    );
    return standardsPerSpace.flat();
  }

  countBySpaceIds(spaceIds: SpaceId[]): Promise<Map<SpaceId, number>> {
    return this.services.getStandardService().countBySpaceIds(spaceIds);
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
    rules: import('@packmind/types').RuleWithExamples[];
    organizationId: OrganizationId;
    userId: UserId;
    scope: string | null;
    spaceId: SpaceId | null;
    disableTriggerAssessment?: boolean;
    source?: PackmindEventSource;
    method?: StandardCreationMethod;
    originSkill?: string;
    directUpdate?: boolean;
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

  async duplicateStandardToSpace(
    standardId: StandardId,
    destinationSpaceId: SpaceId,
    newUserId: UserId,
  ): Promise<DuplicateStandardResult> {
    return this.services
      .getStandardService()
      .duplicateStandardToSpace(standardId, destinationSpaceId, newUserId);
  }

  async markStandardAsMoved(
    standardId: StandardId,
    destinationSpaceId: SpaceId,
  ): Promise<void> {
    return this.services
      .getStandardService()
      .markStandardAsMoved(standardId, destinationSpaceId);
  }

  async hardDeleteStandard(standardId: StandardId): Promise<void> {
    this.logger.info('Hard deleting standard', { standardId });
    await this.services.getStandardService().hardDeleteStandard(standardId);
  }

  async hardDeleteStandardVersion(versionId: StandardVersionId): Promise<void> {
    this.logger.info('Hard deleting standard version', { versionId });
    await this.services
      .getStandardService()
      .hardDeleteStandardVersion(versionId);
  }
}
