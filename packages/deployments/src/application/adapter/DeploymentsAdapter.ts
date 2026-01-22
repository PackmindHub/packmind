import { PackmindLogger } from '@packmind/logger';
import {
  IBaseAdapter,
  JobsService,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  AddArtefactsToPackageCommand,
  AddArtefactsToPackageResponse,
  AddTargetCommand,
  CreatePackageCommand,
  CreatePackageResponse,
  UpdatePackageCommand,
  UpdatePackageResponse,
  CreateRenderModeConfigurationCommand,
  DeletePackagesBatchCommand,
  DeletePackagesBatchResponse,
  DeleteTargetCommand,
  DeleteTargetResponse,
  DeployDefaultSkillsCommand,
  DeployDefaultSkillsResponse,
  DeploymentOverview,
  Distribution,
  DownloadDefaultSkillsZipFileCommand,
  DownloadDefaultSkillsZipFileResponse,
  DownloadDefaultSkillsZipForAgentCommand,
  DownloadDefaultSkillsZipForAgentResponse,
  FindActiveStandardVersionsByTargetCommand,
  FindActiveStandardVersionsByTargetResponse,
  GetDeploymentOverviewCommand,
  GetPackageByIdCommand,
  GetPackageByIdResponse,
  GetPackageSummaryCommand,
  GetPackageSummaryResponse,
  GetRenderModeConfigurationCommand,
  GetRenderModeConfigurationResult,
  GetStandardDeploymentOverviewCommand,
  GetSkillDeploymentOverviewCommand,
  GetTargetsByGitRepoCommand,
  GetTargetsByOrganizationCommand,
  GetTargetsByRepositoryCommand,
  IAccountsPort,
  IAccountsPortName,
  ICodingAgentPort,
  ICodingAgentPortName,
  IDeploymentPort,
  IGitPort,
  IGitPortName,
  IPullContentResponse,
  IRecipesPort,
  IRecipesPortName,
  ISkillsPort,
  ISkillsPortName,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPort,
  IStandardsPortName,
  ListDeploymentsByPackageCommand,
  ListDistributionsByRecipeCommand,
  ListDistributionsByStandardCommand,
  ListDistributionsBySkillCommand,
  ListPackagesCommand,
  ListPackagesResponse,
  ListPackagesBySpaceCommand,
  ListPackagesBySpaceResponse,
  NotifyDistributionCommand,
  NotifyDistributionResponse,
  PackagesDeployment,
  RemovePackageFromTargetsCommand,
  RemovePackageFromTargetsResponse,
  PublishArtifactsCommand,
  PublishArtifactsResponse,
  PublishPackagesCommand,
  PullContentCommand,
  RenderModeConfiguration,
  StandardDeploymentOverview,
  SkillDeploymentOverview,
  Target,
  TargetWithRepository,
  UpdateRenderModeConfigurationCommand,
  UpdateTargetCommand,
} from '@packmind/types';
import { IDeploymentsDelayedJobs } from '../../domain/jobs';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { IDistributedPackageRepository } from '../../domain/repositories/IDistributedPackageRepository';
import { PublishArtifactsJobFactory } from '../../infra/jobs/PublishArtifactsJobFactory';
import { DeploymentsServices } from '../services/DeploymentsServices';
import { AddArtefactsToPackageUsecase } from '../useCases/addArtefactsToPackage/addArtefactsToPackage.usecase';
import { AddTargetUseCase } from '../useCases/AddTargetUseCase';
import { CreatePackageUsecase } from '../useCases/createPackage/createPackage.usecase';
import { UpdatePackageUsecase } from '../useCases/updatePackage/updatePackage.usecase';
import { CreateRenderModeConfigurationUseCase } from '../useCases/CreateRenderModeConfigurationUseCase';
import { DeletePackagesBatchUsecase } from '../useCases/deletePackage/deletePackagesBatch.usecase';
import { DeleteTargetUseCase } from '../useCases/DeleteTargetUseCase';
import { DeployDefaultSkillsUseCase } from '../useCases/DeployDefaultSkillsUseCase';
import { DownloadDefaultSkillsZipFileUseCase } from '../useCases/DownloadDefaultSkillsZipFileUseCase';
import { DownloadDefaultSkillsZipForAgentUseCase } from '../useCases/DownloadDefaultSkillsZipForAgentUseCase';
import { FindActiveStandardVersionsByTargetUseCase } from '../useCases/FindActiveStandardVersionsByTargetUseCase';
import { GetDeploymentOverviewUseCase } from '../useCases/GetDeploymentOverviewUseCase';
import { GetPackageByIdUsecase } from '../useCases/getPackageById/getPackageById.usecase';
import { GetRenderModeConfigurationUseCase } from '../useCases/GetRenderModeConfigurationUseCase';
import { GetStandardDeploymentOverviewUseCase } from '../useCases/GetStandardDeploymentOverviewUseCase';
import { GetSkillsDeploymentOverviewUseCase } from '../useCases/GetSkillsDeploymentOverviewUseCase';
import { GetTargetsByGitRepoUseCase } from '../useCases/GetTargetsByGitRepoUseCase';
import { GetTargetsByOrganizationUseCase } from '../useCases/GetTargetsByOrganizationUseCase';
import { GetTargetsByRepositoryUseCase } from '../useCases/GetTargetsByRepositoryUseCase';
import { ListDeploymentsByPackageUseCase } from '../useCases/ListDeploymentsByPackageUseCase';
import { ListDistributionsByRecipeUseCase } from '../useCases/ListDistributionsByRecipeUseCase';
import { ListDistributionsByStandardUseCase } from '../useCases/ListDistributionsByStandardUseCase';
import { ListDistributionsBySkillUseCase } from '../useCases/ListDistributionsBySkillUseCase';
import { ListPackagesUsecase } from '../useCases/listPackages/listPackages.usecase';
import { NotifyDistributionUseCase } from '../useCases/notifyDistribution/notifyDistribution.usecase';
import { RemovePackageFromTargetsUseCase } from '../useCases/RemovePackageFromTargetsUseCase';
import { ListPackagesBySpaceUsecase } from '../useCases/listPackagesBySpace/listPackagesBySpace.usecase';
import { GetPackageSummaryUsecase } from '../useCases/getPackageSummary/getPackageSummary.usecase';
import { PublishArtifactsUseCase } from '../useCases/PublishArtifactsUseCase';
import { PublishPackagesUseCase } from '../useCases/PublishPackagesUseCase';
import { PullContentUseCase } from '../useCases/PullContentUseCase';
import { UpdateRenderModeConfigurationUseCase } from '../useCases/UpdateRenderModeConfigurationUseCase';
import { UpdateTargetUseCase } from '../useCases/UpdateTargetUseCase';

const origin = 'DeploymentsAdapter';

export class DeploymentsAdapter
  implements IBaseAdapter<IDeploymentPort>, IDeploymentPort
{
  private deploymentsDelayedJobs: IDeploymentsDelayedJobs | null = null;
  private gitPort: IGitPort | null = null;
  private recipesPort: IRecipesPort | null = null;
  private codingAgentPort: ICodingAgentPort | null = null;
  private standardsPort: IStandardsPort | null = null;
  private skillsPort: ISkillsPort | null = null;
  private spacesPort: ISpacesPort | null = null;
  private accountsPort: IAccountsPort | null = null;

  // Use cases - initialized in initialize()
  private _publishArtifactsUseCase!: PublishArtifactsUseCase;
  private _publishPackagesUseCase!: PublishPackagesUseCase;
  private _findActiveStandardVersionsByTargetUseCase!: FindActiveStandardVersionsByTargetUseCase;
  private _getDeploymentOverviewUseCase!: GetDeploymentOverviewUseCase;
  private _listDeploymentsByPackageUseCase!: ListDeploymentsByPackageUseCase;
  private _listDistributionsByRecipeUseCase!: ListDistributionsByRecipeUseCase;
  private _listDistributionsByStandardUseCase!: ListDistributionsByStandardUseCase;
  private _listDistributionsBySkillUseCase!: ListDistributionsBySkillUseCase;
  private _getStandardDeploymentOverviewUseCase!: GetStandardDeploymentOverviewUseCase;
  private _getSkillsDeploymentOverviewUseCase!: GetSkillsDeploymentOverviewUseCase;
  private _addTargetUseCase!: AddTargetUseCase;
  private _getTargetsByGitRepoUseCase!: GetTargetsByGitRepoUseCase;
  private _getTargetsByRepositoryUseCase!: GetTargetsByRepositoryUseCase;
  private _getTargetsByOrganizationUseCase!: GetTargetsByOrganizationUseCase;
  private _updateTargetUseCase!: UpdateTargetUseCase;
  private _deleteTargetUseCase!: DeleteTargetUseCase;
  private _getRenderModeConfigurationUseCase!: GetRenderModeConfigurationUseCase;
  private _createRenderModeConfigurationUseCase!: CreateRenderModeConfigurationUseCase;
  private _updateRenderModeConfigurationUseCase!: UpdateRenderModeConfigurationUseCase;
  private _pullAllContentUseCase!: PullContentUseCase;
  private _listPackagesUseCase!: ListPackagesUsecase;
  private _listPackagesBySpaceUseCase!: ListPackagesBySpaceUsecase;
  private _getPackageSummaryUseCase!: GetPackageSummaryUsecase;
  private _createPackageUseCase!: CreatePackageUsecase;
  private _updatePackageUseCase!: UpdatePackageUsecase;
  private _getPackageByIdUseCase!: GetPackageByIdUsecase;
  private _deletePackagesBatchUseCase!: DeletePackagesBatchUsecase;
  private _addArtefactsToPackageUseCase!: AddArtefactsToPackageUsecase;
  private _notifyDistributionUseCase!: NotifyDistributionUseCase;
  private _removePackageFromTargetsUseCase!: RemovePackageFromTargetsUseCase;
  private _deployDefaultSkillsUseCase!: DeployDefaultSkillsUseCase;
  private _downloadDefaultSkillsZipFileUseCase!: DownloadDefaultSkillsZipFileUseCase;
  private _downloadDefaultSkillsZipForAgentUseCase!: DownloadDefaultSkillsZipForAgentUseCase;

  constructor(
    private readonly deploymentsServices: DeploymentsServices,
    private readonly distributionRepository: IDistributionRepository,
    private readonly distributedPackageRepository: IDistributedPackageRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  /**
   * Initialize adapter with ports and services from registry.
   * All ports and services in signature are REQUIRED.
   */
  public async initialize(ports: {
    [IGitPortName]: IGitPort;
    [IRecipesPortName]: IRecipesPort;
    [ICodingAgentPortName]: ICodingAgentPort;
    [IStandardsPortName]: IStandardsPort;
    [ISkillsPortName]: ISkillsPort;
    [ISpacesPortName]: ISpacesPort;
    [IAccountsPortName]: IAccountsPort;
    jobsService: JobsService;
    eventEmitterService: PackmindEventEmitterService;
  }): Promise<void> {
    // Step 1: Set all ports
    this.gitPort = ports[IGitPortName];
    this.recipesPort = ports[IRecipesPortName];
    this.codingAgentPort = ports[ICodingAgentPortName];
    this.standardsPort = ports[IStandardsPortName];
    this.skillsPort = ports[ISkillsPortName];
    this.spacesPort = ports[ISpacesPortName];
    this.accountsPort = ports[IAccountsPortName];

    // Step 2: Build delayed jobs
    this.deploymentsDelayedJobs = await this.buildDelayedJobs(
      ports.jobsService,
    );

    // Step 3: Validate all required ports are set
    if (
      !this.gitPort &&
      !this.recipesPort &&
      !this.codingAgentPort &&
      !this.standardsPort &&
      !this.skillsPort &&
      !this.spacesPort &&
      !this.accountsPort &&
      !this.deploymentsServices
    ) {
      throw new Error('DeploymentsAdapter: Required ports not provided');
    }

    // Step 4: Create all use cases with non-null ports
    // DeployDefaultSkillsUseCase must be created first as it's used by PublishArtifactsUseCase and DownloadDefaultSkillsZipFileUseCase
    this._deployDefaultSkillsUseCase = new DeployDefaultSkillsUseCase(
      this.deploymentsServices.getRenderModeConfigurationService(),
      this.codingAgentPort,
      this.accountsPort,
    );

    this._downloadDefaultSkillsZipFileUseCase =
      new DownloadDefaultSkillsZipFileUseCase(
        this._deployDefaultSkillsUseCase,
        this.accountsPort,
      );

    this._downloadDefaultSkillsZipForAgentUseCase =
      new DownloadDefaultSkillsZipForAgentUseCase(this.codingAgentPort);

    this._publishArtifactsUseCase = new PublishArtifactsUseCase(
      this.recipesPort,
      this.standardsPort,
      this.skillsPort,
      this.gitPort,
      this.codingAgentPort,
      this.distributionRepository,
      this.deploymentsServices.getTargetService(),
      this.deploymentsServices.getRenderModeConfigurationService(),
      ports.eventEmitterService,
      this.deploymentsDelayedJobs.publishArtifactsDelayedJob,
      this.accountsPort,
      this._deployDefaultSkillsUseCase,
    );

    this._publishPackagesUseCase = new PublishPackagesUseCase(
      this.recipesPort,
      this.standardsPort,
      this.skillsPort,
      this,
      this.deploymentsServices.getPackageService(),
      this.distributedPackageRepository,
    );

    this._findActiveStandardVersionsByTargetUseCase =
      new FindActiveStandardVersionsByTargetUseCase(
        this.distributionRepository,
      );

    const getTargetsByOrganizationUseCase = new GetTargetsByOrganizationUseCase(
      this.deploymentsServices.getTargetService(),
      this.gitPort,
    );

    this._getDeploymentOverviewUseCase = new GetDeploymentOverviewUseCase(
      this.distributionRepository,
      this.recipesPort,
      this.spacesPort,
      this.gitPort,
      getTargetsByOrganizationUseCase,
    );

    this._listDeploymentsByPackageUseCase = new ListDeploymentsByPackageUseCase(
      this.distributionRepository,
    );

    this._listDistributionsByRecipeUseCase =
      new ListDistributionsByRecipeUseCase(this.distributionRepository);

    this._listDistributionsByStandardUseCase =
      new ListDistributionsByStandardUseCase(this.distributionRepository);

    this._listDistributionsBySkillUseCase = new ListDistributionsBySkillUseCase(
      this.distributionRepository,
    );

    this._getStandardDeploymentOverviewUseCase =
      new GetStandardDeploymentOverviewUseCase(
        this.distributionRepository,
        this.standardsPort,
        this.gitPort,
        this.spacesPort,
      );

    this._getSkillsDeploymentOverviewUseCase =
      new GetSkillsDeploymentOverviewUseCase(
        this.distributionRepository,
        this.skillsPort,
        this.gitPort,
        this.spacesPort,
      );

    this._addTargetUseCase = new AddTargetUseCase(
      this.deploymentsServices.getTargetService(),
      this.gitPort,
    );

    this._getTargetsByGitRepoUseCase = new GetTargetsByGitRepoUseCase(
      this.deploymentsServices.getTargetService(),
    );

    this._getTargetsByRepositoryUseCase = new GetTargetsByRepositoryUseCase(
      this.deploymentsServices.getTargetService(),
      this.gitPort,
    );

    this._getTargetsByOrganizationUseCase = new GetTargetsByOrganizationUseCase(
      this.deploymentsServices.getTargetService(),
      this.gitPort,
    );

    this._updateTargetUseCase = new UpdateTargetUseCase(
      this.deploymentsServices.getTargetService(),
      this.gitPort,
    );

    this._deleteTargetUseCase = new DeleteTargetUseCase(
      this.deploymentsServices.getTargetService(),
      this.gitPort,
    );

    this._getRenderModeConfigurationUseCase =
      new GetRenderModeConfigurationUseCase(
        this.deploymentsServices.getRenderModeConfigurationService(),
        this.accountsPort,
      );

    this._createRenderModeConfigurationUseCase =
      new CreateRenderModeConfigurationUseCase(
        this.deploymentsServices.getRenderModeConfigurationService(),
        this.accountsPort,
      );

    this._updateRenderModeConfigurationUseCase =
      new UpdateRenderModeConfigurationUseCase(
        this.deploymentsServices.getRenderModeConfigurationService(),
        this.accountsPort,
      );

    this._pullAllContentUseCase = new PullContentUseCase(
      this.deploymentsServices.getPackageService(),
      this.recipesPort,
      this.standardsPort,
      this.skillsPort,
      this.codingAgentPort,
      this.deploymentsServices.getRenderModeConfigurationService(),
      this.accountsPort,
      ports.eventEmitterService,
      this.gitPort,
      this.distributionRepository,
      this.deploymentsServices.getTargetService(),
    );

    this._listPackagesBySpaceUseCase = new ListPackagesBySpaceUsecase(
      this.accountsPort,
      this.deploymentsServices,
      this.spacesPort,
    );

    this._listPackagesUseCase = new ListPackagesUsecase(
      this.accountsPort,
      this.deploymentsServices,
    );

    this._getPackageSummaryUseCase = new GetPackageSummaryUsecase(
      this.accountsPort,
      this.deploymentsServices,
    );

    this._createPackageUseCase = new CreatePackageUsecase(
      this.accountsPort,
      this.deploymentsServices,
      this.spacesPort,
      this.recipesPort,
      this.standardsPort,
      this.skillsPort,
    );

    this._updatePackageUseCase = new UpdatePackageUsecase(
      this.accountsPort,
      this.deploymentsServices,
      this.spacesPort,
      this.recipesPort,
      this.standardsPort,
      this.skillsPort,
    );

    this._getPackageByIdUseCase = new GetPackageByIdUsecase(
      this.accountsPort,
      this.deploymentsServices,
    );

    this._deletePackagesBatchUseCase = new DeletePackagesBatchUsecase(
      this.deploymentsServices.getPackageService(),
    );

    this._addArtefactsToPackageUseCase = new AddArtefactsToPackageUsecase(
      this.accountsPort,
      this.deploymentsServices,
      this.spacesPort,
      this.recipesPort,
      this.standardsPort,
    );

    this._notifyDistributionUseCase = new NotifyDistributionUseCase(
      this.accountsPort,
      this.gitPort,
      this.recipesPort,
      this.standardsPort,
      this.skillsPort,
      this.deploymentsServices.getRepositories().getPackageRepository(),
      this.deploymentsServices.getRepositories().getTargetRepository(),
      this.distributionRepository,
      this.distributedPackageRepository,
      this.deploymentsServices.getRenderModeConfigurationService(),
    );

    this._removePackageFromTargetsUseCase = new RemovePackageFromTargetsUseCase(
      this.deploymentsServices.getPackageService(),
      this.deploymentsServices.getTargetService(),
      this.distributionRepository,
      this.distributedPackageRepository,
      this.recipesPort,
      this.standardsPort,
      this.gitPort,
      this.codingAgentPort,
      this.deploymentsServices.getRenderModeConfigurationService(),
    );
  }

  /**
   * Build delayed jobs from JobsService.
   * This is called internally during initialize().
   */
  private async buildDelayedJobs(
    jobsService: JobsService,
  ): Promise<IDeploymentsDelayedJobs> {
    this.logger.debug('Building delayed jobs for Deployments domain');

    const jobFactory = new PublishArtifactsJobFactory(
      this.distributionRepository,
      this.gitPort!,
    );

    jobsService.registerJobQueue(jobFactory.getQueueName(), jobFactory);
    await jobFactory.createQueue();

    if (!jobFactory.delayedJob) {
      throw new Error(
        'DeploymentsAdapter: Failed to create delayed job for publish artifacts',
      );
    }

    this.logger.debug('Deployments delayed jobs built successfully');
    return {
      publishArtifactsDelayedJob: jobFactory.delayedJob,
    };
  }

  public isReady(): boolean {
    return (
      this.gitPort != null &&
      this.recipesPort != null &&
      this.codingAgentPort != null &&
      this.standardsPort != null &&
      this.spacesPort != null &&
      this.accountsPort != null &&
      this.deploymentsServices != null &&
      this.deploymentsDelayedJobs != null
    );
  }

  public getPort(): IDeploymentPort {
    return this as IDeploymentPort;
  }

  publishArtifacts(
    command: PublishArtifactsCommand,
  ): Promise<PublishArtifactsResponse> {
    return this._publishArtifactsUseCase.execute(command);
  }

  publishPackages(
    command: PublishPackagesCommand,
  ): Promise<PackagesDeployment[]> {
    return this._publishPackagesUseCase.execute(command);
  }

  findActiveStandardVersionsByTarget(
    command: FindActiveStandardVersionsByTargetCommand,
  ): Promise<FindActiveStandardVersionsByTargetResponse> {
    return this._findActiveStandardVersionsByTargetUseCase.execute(command);
  }

  getDeploymentOverview(
    command: GetDeploymentOverviewCommand,
  ): Promise<DeploymentOverview> {
    return this._getDeploymentOverviewUseCase.execute(command);
  }

  listDeploymentsByPackage(
    command: ListDeploymentsByPackageCommand,
  ): Promise<Distribution[]> {
    return this._listDeploymentsByPackageUseCase.execute(command);
  }

  listDistributionsByRecipe(
    command: ListDistributionsByRecipeCommand,
  ): Promise<Distribution[]> {
    return this._listDistributionsByRecipeUseCase.execute(command);
  }

  listDistributionsByStandard(
    command: ListDistributionsByStandardCommand,
  ): Promise<Distribution[]> {
    return this._listDistributionsByStandardUseCase.execute(command);
  }

  listDistributionsBySkill(
    command: ListDistributionsBySkillCommand,
  ): Promise<Distribution[]> {
    return this._listDistributionsBySkillUseCase.execute(command);
  }

  getStandardDeploymentOverview(
    command: GetStandardDeploymentOverviewCommand,
  ): Promise<StandardDeploymentOverview> {
    return this._getStandardDeploymentOverviewUseCase.execute(command);
  }

  getSkillsDeploymentOverview(
    command: GetSkillDeploymentOverviewCommand,
  ): Promise<SkillDeploymentOverview> {
    return this._getSkillsDeploymentOverviewUseCase.execute(command);
  }

  async addTarget(command: AddTargetCommand): Promise<Target> {
    return this._addTargetUseCase.execute(command);
  }

  async getTargetsByGitRepo(
    command: GetTargetsByGitRepoCommand,
  ): Promise<Target[]> {
    return this._getTargetsByGitRepoUseCase.execute(command);
  }

  async getTargetsByRepository(
    command: GetTargetsByRepositoryCommand,
  ): Promise<TargetWithRepository[]> {
    return this._getTargetsByRepositoryUseCase.execute(command);
  }

  async getTargetsByOrganization(
    command: GetTargetsByOrganizationCommand,
  ): Promise<TargetWithRepository[]> {
    return this._getTargetsByOrganizationUseCase.execute(command);
  }

  async updateTarget(command: UpdateTargetCommand): Promise<Target> {
    return this._updateTargetUseCase.execute(command);
  }

  async deleteTarget(
    command: DeleteTargetCommand,
  ): Promise<DeleteTargetResponse> {
    return this._deleteTargetUseCase.execute(command);
  }

  async getRenderModeConfiguration(
    command: GetRenderModeConfigurationCommand,
  ): Promise<GetRenderModeConfigurationResult> {
    return this._getRenderModeConfigurationUseCase.execute(command);
  }

  async createRenderModeConfiguration(
    command: CreateRenderModeConfigurationCommand,
  ): Promise<RenderModeConfiguration> {
    return this._createRenderModeConfigurationUseCase.execute(command);
  }

  async updateRenderModeConfiguration(
    command: UpdateRenderModeConfigurationCommand,
  ): Promise<RenderModeConfiguration> {
    return this._updateRenderModeConfigurationUseCase.execute(command);
  }

  async pullAllContent(
    command: PullContentCommand,
  ): Promise<IPullContentResponse> {
    return this._pullAllContentUseCase.execute(command);
  }

  async listPackagesBySpace(
    command: ListPackagesBySpaceCommand,
  ): Promise<ListPackagesBySpaceResponse> {
    return this._listPackagesBySpaceUseCase.execute(command);
  }

  async listPackages(
    command: ListPackagesCommand,
  ): Promise<ListPackagesResponse> {
    return this._listPackagesUseCase.execute(command);
  }

  async getPackageSummary(
    command: GetPackageSummaryCommand,
  ): Promise<GetPackageSummaryResponse> {
    return this._getPackageSummaryUseCase.execute(command);
  }

  async createPackage(
    command: CreatePackageCommand,
  ): Promise<CreatePackageResponse> {
    return this._createPackageUseCase.execute(command);
  }

  async updatePackage(
    command: UpdatePackageCommand,
  ): Promise<UpdatePackageResponse> {
    return this._updatePackageUseCase.execute(command);
  }

  async getPackageById(
    command: GetPackageByIdCommand,
  ): Promise<GetPackageByIdResponse> {
    return this._getPackageByIdUseCase.execute(command);
  }

  async deletePackagesBatch(
    command: DeletePackagesBatchCommand,
  ): Promise<DeletePackagesBatchResponse> {
    return this._deletePackagesBatchUseCase.execute(command);
  }

  async addArtefactsToPackage(
    command: AddArtefactsToPackageCommand,
  ): Promise<AddArtefactsToPackageResponse> {
    return this._addArtefactsToPackageUseCase.execute(command);
  }

  async notifyDistribution(
    command: NotifyDistributionCommand,
  ): Promise<NotifyDistributionResponse> {
    return this._notifyDistributionUseCase.execute(command);
  }

  async removePackageFromTargets(
    command: RemovePackageFromTargetsCommand,
  ): Promise<RemovePackageFromTargetsResponse> {
    return this._removePackageFromTargetsUseCase.execute(command);
  }

  async deployDefaultSkills(
    command: DeployDefaultSkillsCommand,
  ): Promise<DeployDefaultSkillsResponse> {
    return this._deployDefaultSkillsUseCase.execute(command);
  }

  async downloadDefaultSkillsZipFile(
    command: DownloadDefaultSkillsZipFileCommand,
  ): Promise<DownloadDefaultSkillsZipFileResponse> {
    return this._downloadDefaultSkillsZipFileUseCase.execute(command);
  }

  async downloadDefaultSkillsZipForAgent(
    command: DownloadDefaultSkillsZipForAgentCommand,
  ): Promise<DownloadDefaultSkillsZipForAgentResponse> {
    return this._downloadDefaultSkillsZipForAgentUseCase.execute(command);
  }
}
