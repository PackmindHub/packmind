import { PackmindLogger } from '@packmind/logger';
import {
  IBaseAdapter,
  JobsService,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  AddArtefactsToPackageCommand,
  AddArtefactsToPackageResponse,
  CancelPluginRemovalCommand,
  CancelPluginRemovalResponse,
  ListMarketplaceDistributionsCommand,
  ListMarketplaceDistributionsResponse,
  MarkPluginForRemovalCommand,
  MarkPluginForRemovalResponse,
  SyncMarketplaceNowCommand,
  SyncMarketplaceNowResponse,
  AddTargetCommand,
  CreatePackageCommand,
  CreatePackageResponse,
  UpdatePackageCommand,
  UpdatePackageResponse,
  CreateRenderModeConfigurationCommand,
  DashboardKpiResponse,
  DashboardNonLiveResponse,
  DeletePackagesBatchCommand,
  DeletePackagesBatchResponse,
  DeleteTargetCommand,
  DeleteTargetResponse,
  DeployDefaultSkillsCommand,
  DeployDefaultSkillsResponse,
  Distribution,
  DownloadDefaultSkillsZipForAgentCommand,
  DownloadDefaultSkillsZipForAgentResponse,
  DownloadSkillZipForAgentCommand,
  DownloadSkillZipForAgentResponse,
  FindActiveStandardVersionsByTargetCommand,
  FindActiveStandardVersionsByTargetResponse,
  GetContentByVersionsCommand,
  GetContentByVersionsResponse,
  GetDashboardKpiCommand,
  GetDashboardNonLiveCommand,
  GetDeployedContentCommand,
  GetDeployedContentResponse,
  GetPackageByIdCommand,
  GetPackageByIdResponse,
  GetPackageSummaryCommand,
  GetPackageSummaryResponse,
  GetRenderModeConfigurationCommand,
  GetRenderModeConfigurationResult,
  GetTargetsByGitRepoCommand,
  GetTargetByIdCommand,
  GetTargetByIdResponse,
  GetTargetsByOrganizationCommand,
  GetTargetsByRepositoryCommand,
  IAccountsPort,
  IAccountsPortName,
  ICodingAgentPort,
  ICodingAgentPortName,
  IDeploymentPort,
  IGitPort,
  IGitPortName,
  InstallPackagesCommand,
  InstallPackagesResponse,
  IPullContentResponse,
  IRecipesPort,
  IRecipesPortName,
  ISkillsPort,
  ISkillsPortName,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPort,
  IStandardsPortName,
  FindMarketplaceDistributionByIdCommand,
  FindMarketplaceDistributionByIdResponse,
  LinkMarketplaceCommand,
  LinkMarketplaceResponse,
  ListDeploymentsByPackageCommand,
  IListActiveDistributedPackagesBySpaceUseCase,
  ListActiveDistributedPackagesBySpaceCommand,
  ListActiveDistributedPackagesBySpaceResponse,
  ListDistributionsByRecipeCommand,
  ListDistributionsByStandardCommand,
  ListDistributionsBySkillCommand,
  ListMarketplaceDistributionsForPackageCommand,
  ListMarketplaceDistributionsForPackageResponse,
  ListMarketplacesCommand,
  ListMarketplacesResponse,
  ListPackagesCommand,
  ListPackagesResponse,
  ListPackagesBySpaceCommand,
  ListPackagesBySpaceResponse,
  NotifyArtefactsDistributionCommand,
  NotifyArtefactsDistributionResponse,
  NotifyDistributionCommand,
  NotifyDistributionResponse,
  PackagesDeployment,
  RemovePackageFromTargetsCommand,
  RemovePackageFromTargetsResponse,
  PublishArtifactsCommand,
  PublishArtifactsResponse,
  PublishPackageOnMarketplaceCommand,
  PublishPackageOnMarketplaceResponse,
  PublishPackagesCommand,
  PullContentCommand,
  RenderModeConfiguration,
  RenderPackageAsPluginCommand,
  RenderPackageAsPluginResponse,
  Target,
  TargetWithRepository,
  TrackPluginDeletedCommand,
  TrackPluginDeletedResponse,
  UnlinkMarketplaceCommand,
  UnlinkMarketplaceResponse,
  UpdateRenderModeConfigurationCommand,
  UpdateTargetCommand,
  ValidateMarketplaceUrlCommand,
  ValidateMarketplaceUrlResponse,
} from '@packmind/types';
import { GitRepoService } from '@packmind/git';
import { IDeploymentsDelayedJobs } from '../../domain/jobs';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { IDistributedPackageRepository } from '../../domain/repositories/IDistributedPackageRepository';
import { IMarketplaceDistributionRepository } from '../../domain/repositories/IMarketplaceDistributionRepository';
import { IMarketplaceRepository } from '../../domain/repositories/IMarketplaceRepository';
import { MarketplaceReconciliationJobFactory } from '../../infra/jobs/MarketplaceReconciliationJobFactory';
import { PublishArtifactsJobFactory } from '../../infra/jobs/PublishArtifactsJobFactory';
import { PublishPluginToMarketplaceJobFactory } from '../../infra/jobs/PublishPluginToMarketplaceJobFactory';
import { RemovePluginFromMarketplaceJobFactory } from '../../infra/jobs/RemovePluginFromMarketplaceJobFactory';
import { RemovePluginFromMarketplaceDelayedJob } from '../jobs/RemovePluginFromMarketplaceDelayedJob';
import { DeploymentsServices } from '../services/DeploymentsServices';
import { MarketplaceDescriptorParserRegistry } from '../services/MarketplaceDescriptorParserRegistry';
import { formatMarketplacePluginDescription } from '../services/formatMarketplacePluginDescription';
import { TargetResolutionService } from '../services/TargetResolutionService';
import { AddArtefactsToPackageUsecase } from '../useCases/addArtefactsToPackage/addArtefactsToPackage.usecase';
import { AddTargetUseCase } from '../useCases/AddTargetUseCase';
import { CreatePackageUsecase } from '../useCases/createPackage/createPackage.usecase';
import { UpdatePackageUsecase } from '../useCases/updatePackage/updatePackage.usecase';
import { CreateRenderModeConfigurationUseCase } from '../useCases/CreateRenderModeConfigurationUseCase';
import { DeletePackagesBatchUsecase } from '../useCases/deletePackage/deletePackagesBatch.usecase';
import { DeleteTargetUseCase } from '../useCases/DeleteTargetUseCase';
import { DeployDefaultSkillsUseCase } from '../useCases/DeployDefaultSkillsUseCase';
import { DownloadDefaultSkillsZipForAgentUseCase } from '../useCases/DownloadDefaultSkillsZipForAgentUseCase';
import { DownloadSkillZipForAgentUseCase } from '../useCases/DownloadSkillZipForAgentUseCase';
import { FindActiveStandardVersionsByTargetUseCase } from '../useCases/FindActiveStandardVersionsByTargetUseCase';
import { GetPackageByIdUsecase } from '../useCases/getPackageById/getPackageById.usecase';
import { CancelPluginRemovalUseCase } from '../useCases/cancelPluginRemoval';
import { LinkMarketplaceUseCase } from '../useCases/linkMarketplace';
import { ListMarketplaceDistributionsForPackageUseCase } from '../useCases/listMarketplaceDistributionsForPackage';
import { ListMarketplaceDistributionsUseCase } from '../useCases/listMarketplaceDistributions';
import { ListMarketplacesUseCase } from '../useCases/listMarketplaces';
import { MarkPluginForRemovalUseCase } from '../useCases/markPluginForRemoval';
import { SyncMarketplaceNowUseCase } from '../useCases/syncMarketplaceNow';
import { PublishPackageOnMarketplaceUseCase } from '../useCases/publishPackageOnMarketplace';
import { UnlinkMarketplaceUseCase } from '../useCases/unlinkMarketplace';
import { ValidateMarketplaceUrlUseCase } from '../useCases/validateMarketplaceUrl';
import { GetRenderModeConfigurationUseCase } from '../useCases/GetRenderModeConfigurationUseCase';
import { GetTargetByIdUseCase } from '../useCases/GetTargetByIdUseCase';
import { GetTargetsByGitRepoUseCase } from '../useCases/GetTargetsByGitRepoUseCase';
import { GetTargetsByOrganizationUseCase } from '../useCases/GetTargetsByOrganizationUseCase';
import { GetTargetsByRepositoryUseCase } from '../useCases/GetTargetsByRepositoryUseCase';
import { ListDeploymentsByPackageUseCase } from '../useCases/ListDeploymentsByPackageUseCase';
import { ListActiveDistributedPackagesBySpaceUseCase } from '../useCases/ListActiveDistributedPackagesBySpaceUseCase';
import { ListDistributionsByRecipeUseCase } from '../useCases/ListDistributionsByRecipeUseCase';
import { ListDistributionsByStandardUseCase } from '../useCases/ListDistributionsByStandardUseCase';
import { ListDistributionsBySkillUseCase } from '../useCases/ListDistributionsBySkillUseCase';
import { ListPackagesUsecase } from '../useCases/listPackages/listPackages.usecase';
import { NotifyArtefactsDistributionUseCase } from '../useCases/notifyArtefactsDistribution/notifyArtefactsDistribution.usecase';
import { NotifyDistributionUseCase } from '../useCases/notifyDistribution/notifyDistribution.usecase';
import { RemovePackageFromTargetsUseCase } from '../useCases/RemovePackageFromTargetsUseCase';
import { ListPackagesBySpaceUsecase } from '../useCases/listPackagesBySpace/listPackagesBySpace.usecase';
import { GetPackageSummaryUsecase } from '../useCases/getPackageSummary/getPackageSummary.usecase';
import { PublishArtifactsUseCase } from '../useCases/PublishArtifactsUseCase';
import { PublishPackagesUseCase } from '../useCases/PublishPackagesUseCase';
import { GetContentByVersionsUseCase } from '../useCases/GetContentByVersionsUseCase';
import { GetDashboardKpiUseCase } from '../useCases/getDashboardKpi/GetDashboardKpiUseCase';
import { GetDashboardNonLiveUseCase } from '../useCases/getDashboardNonLive/GetDashboardNonLiveUseCase';
import { GetDeployedContentUseCase } from '../useCases/GetDeployedContentUseCase';
import { InstallPackagesUseCase } from '../useCases/InstallPackagesUseCase';
import { PullContentUseCase } from '../useCases/PullContentUseCase';
import { RenderPackageAsPluginUseCase } from '../useCases/renderPackageAsPlugin/RenderPackageAsPluginUseCase';
import { TrackPluginDeletedUseCase } from '../useCases/trackPluginDeleted/TrackPluginDeletedUseCase';
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
  private _listDeploymentsByPackageUseCase!: ListDeploymentsByPackageUseCase;
  private _listDistributionsByRecipeUseCase!: ListDistributionsByRecipeUseCase;
  private _listDistributionsByStandardUseCase!: ListDistributionsByStandardUseCase;
  private _listDistributionsBySkillUseCase!: ListDistributionsBySkillUseCase;
  private _addTargetUseCase!: AddTargetUseCase;
  private _getTargetByIdUseCase!: GetTargetByIdUseCase;
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
  private _notifyArtefactsDistributionUseCase!: NotifyArtefactsDistributionUseCase;
  private _notifyDistributionUseCase!: NotifyDistributionUseCase;
  private _removePackageFromTargetsUseCase!: RemovePackageFromTargetsUseCase;
  private _deployDefaultSkillsUseCase!: DeployDefaultSkillsUseCase;
  private _downloadDefaultSkillsZipForAgentUseCase!: DownloadDefaultSkillsZipForAgentUseCase;
  private _downloadSkillZipForAgentUseCase!: DownloadSkillZipForAgentUseCase;
  private _getContentByVersionsUseCase!: GetContentByVersionsUseCase;
  private _getDashboardKpiUseCase!: GetDashboardKpiUseCase;
  private _getDashboardNonLiveUseCase!: GetDashboardNonLiveUseCase;
  private _getDeployedContentUseCase!: GetDeployedContentUseCase;
  private _installPackagesUseCase!: InstallPackagesUseCase;
  private _renderPackageAsPluginUseCase!: RenderPackageAsPluginUseCase;
  private _trackPluginDeletedUseCase!: TrackPluginDeletedUseCase;
  private _listActiveDistributedPackagesBySpaceUseCase!: ListActiveDistributedPackagesBySpaceUseCase;
  private _linkMarketplaceUseCase!: LinkMarketplaceUseCase;
  private _unlinkMarketplaceUseCase!: UnlinkMarketplaceUseCase;
  private _listMarketplacesUseCase!: ListMarketplacesUseCase;
  private _validateMarketplaceUrlUseCase!: ValidateMarketplaceUrlUseCase;
  private _publishPackageOnMarketplaceUseCase!: PublishPackageOnMarketplaceUseCase;
  private _listMarketplaceDistributionsForPackageUseCase!: ListMarketplaceDistributionsForPackageUseCase;
  private _markPluginForRemovalUseCase!: MarkPluginForRemovalUseCase;
  private _cancelPluginRemovalUseCase!: CancelPluginRemovalUseCase;
  private _syncMarketplaceNowUseCase!: SyncMarketplaceNowUseCase;
  private _listMarketplaceDistributionsUseCase!: ListMarketplaceDistributionsUseCase;

  constructor(
    private readonly deploymentsServices: DeploymentsServices,
    private readonly distributionRepository: IDistributionRepository,
    private readonly distributedPackageRepository: IDistributedPackageRepository,
    private readonly marketplaceRepository: IMarketplaceRepository,
    private readonly marketplaceDistributionRepository: IMarketplaceDistributionRepository,
    private readonly marketplaceDescriptorParserRegistry: MarketplaceDescriptorParserRegistry,
    private readonly gitRepoService: GitRepoService,
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
      ports.eventEmitterService,
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
    // DeployDefaultSkillsUseCase must be created first as it's used by PublishArtifactsUseCase
    this._deployDefaultSkillsUseCase = new DeployDefaultSkillsUseCase(
      this.deploymentsServices.getRenderModeConfigurationService(),
      this.codingAgentPort,
      this.accountsPort,
    );

    this._downloadDefaultSkillsZipForAgentUseCase =
      new DownloadDefaultSkillsZipForAgentUseCase(this.codingAgentPort);

    this._downloadSkillZipForAgentUseCase = new DownloadSkillZipForAgentUseCase(
      this.codingAgentPort,
      this.skillsPort,
    );

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
      this._deployDefaultSkillsUseCase,
    );

    this._publishPackagesUseCase = new PublishPackagesUseCase(
      this.recipesPort,
      this.standardsPort,
      this.skillsPort,
      this,
      this.deploymentsServices.getPackageService(),
      this.distributedPackageRepository,
      this.spacesPort,
    );

    this._findActiveStandardVersionsByTargetUseCase =
      new FindActiveStandardVersionsByTargetUseCase(
        this.distributionRepository,
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

    this._addTargetUseCase = new AddTargetUseCase(
      this.deploymentsServices.getTargetService(),
      this.gitPort,
    );

    this._getTargetByIdUseCase = new GetTargetByIdUseCase(
      this.deploymentsServices.getTargetService(),
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

    const targetResolutionService = new TargetResolutionService(
      this.gitPort,
      this.deploymentsServices.getTargetService(),
      this.distributionRepository,
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
      this.distributionRepository,
      targetResolutionService,
      this.spacesPort,
    );

    this._installPackagesUseCase = new InstallPackagesUseCase(
      this.deploymentsServices.getPackageService(),
      this.recipesPort,
      this.standardsPort,
      this.skillsPort,
      this.codingAgentPort,
      this.deploymentsServices.getRenderModeConfigurationService(),
      this.accountsPort,
      this.spacesPort,
      ports.eventEmitterService,
    );

    this._renderPackageAsPluginUseCase = new RenderPackageAsPluginUseCase(
      this.deploymentsServices.getPackageService(),
      this.recipesPort,
      this.standardsPort,
      this.skillsPort,
      this.spacesPort,
      this.accountsPort,
      targetResolutionService,
      this.distributionRepository,
      this.distributedPackageRepository,
      ports.eventEmitterService,
    );

    this._trackPluginDeletedUseCase = new TrackPluginDeletedUseCase(
      this.deploymentsServices.getPackageService(),
      this.spacesPort,
      this.accountsPort,
      ports.eventEmitterService,
    );

    this._getDeployedContentUseCase = new GetDeployedContentUseCase(
      targetResolutionService,
      this.distributionRepository,
      this.codingAgentPort,
      this.deploymentsServices.getRenderModeConfigurationService(),
      this.deploymentsServices.getPackageService(),
      this.skillsPort,
      this.standardsPort,
      this.accountsPort,
    );

    this._getContentByVersionsUseCase = new GetContentByVersionsUseCase(
      this.codingAgentPort,
      this.deploymentsServices.getRenderModeConfigurationService(),
      this.skillsPort,
      this.standardsPort,
      this.recipesPort,
      this.spacesPort,
      this.accountsPort,
    );

    this._getDashboardKpiUseCase = new GetDashboardKpiUseCase(
      this.distributionRepository,
      this.standardsPort,
      this.recipesPort,
      this.skillsPort,
    );

    this._getDashboardNonLiveUseCase = new GetDashboardNonLiveUseCase(
      this.distributionRepository,
      this.standardsPort,
      this.recipesPort,
      this.skillsPort,
    );

    this._listPackagesBySpaceUseCase = new ListPackagesBySpaceUsecase(
      this.spacesPort,
      this.accountsPort,
      this.deploymentsServices,
    );

    this._listActiveDistributedPackagesBySpaceUseCase =
      new ListActiveDistributedPackagesBySpaceUseCase(
        this.spacesPort,
        this.accountsPort,
        this.distributionRepository,
        this.deploymentsServices.getRepositories().getPackageRepository(),
        this.deploymentsServices.getRepositories().getTargetRepository(),
        this.standardsPort,
        this.recipesPort,
        this.skillsPort,
        this.gitPort,
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
      this.spacesPort,
      this.accountsPort,
      this.deploymentsServices,
      this.recipesPort,
      this.standardsPort,
      this.skillsPort,
    );

    this._updatePackageUseCase = new UpdatePackageUsecase(
      this.spacesPort,
      this.accountsPort,
      this.deploymentsServices,
      this.recipesPort,
      this.standardsPort,
      this.skillsPort,
      ports.eventEmitterService,
    );

    this._getPackageByIdUseCase = new GetPackageByIdUsecase(
      this.spacesPort,
      this.accountsPort,
      this.deploymentsServices,
    );

    this._deletePackagesBatchUseCase = new DeletePackagesBatchUsecase(
      this.deploymentsServices.getPackageService(),
      ports.eventEmitterService,
    );

    this._addArtefactsToPackageUseCase = new AddArtefactsToPackageUsecase(
      this.spacesPort,
      this.accountsPort,
      this.deploymentsServices,
      this.recipesPort,
      this.standardsPort,
      this.skillsPort,
    );

    this._notifyDistributionUseCase = new NotifyDistributionUseCase(
      this.accountsPort,
      this.recipesPort,
      this.standardsPort,
      this.skillsPort,
      this.deploymentsServices.getRepositories().getPackageRepository(),
      this.distributionRepository,
      this.distributedPackageRepository,
      this.deploymentsServices.getRenderModeConfigurationService(),
      targetResolutionService,
      this.spacesPort,
    );

    this._notifyArtefactsDistributionUseCase =
      new NotifyArtefactsDistributionUseCase(
        this.accountsPort,
        this.recipesPort,
        this.standardsPort,
        this.skillsPort,
        this.distributionRepository,
        this.distributedPackageRepository,
        this.deploymentsServices.getRenderModeConfigurationService(),
        targetResolutionService,
      );

    this._removePackageFromTargetsUseCase = new RemovePackageFromTargetsUseCase(
      this.deploymentsServices.getPackageService(),
      this.deploymentsServices.getTargetService(),
      this.distributionRepository,
      this.distributedPackageRepository,
      this.recipesPort,
      this.standardsPort,
      this.skillsPort,
      this.gitPort,
      this.codingAgentPort,
      this.deploymentsServices.getRenderModeConfigurationService(),
    );

    // Marketplace use cases. The reconciliation job is wired through here so
    // both Link/Unlink can drive the BullMQ repeatable schedule.
    this._linkMarketplaceUseCase = new LinkMarketplaceUseCase(
      this.marketplaceRepository,
      this.gitRepoService,
      this.gitPort,
      this.marketplaceDescriptorParserRegistry,
      ports.eventEmitterService,
      this.deploymentsDelayedJobs.marketplaceReconciliationDelayedJob,
      this.accountsPort,
    );

    this._unlinkMarketplaceUseCase = new UnlinkMarketplaceUseCase(
      this.marketplaceRepository,
      this.gitPort,
      ports.eventEmitterService,
      this.deploymentsDelayedJobs.marketplaceReconciliationDelayedJob,
      this.accountsPort,
    );

    this._listMarketplacesUseCase = new ListMarketplacesUseCase(
      this.marketplaceRepository,
      this.gitRepoService,
      this.gitPort,
      this.accountsPort,
    );

    this._validateMarketplaceUrlUseCase = new ValidateMarketplaceUrlUseCase(
      this.gitPort,
      this.marketplaceDescriptorParserRegistry,
      this.accountsPort,
    );

    this._publishPackageOnMarketplaceUseCase =
      new PublishPackageOnMarketplaceUseCase(
        this.marketplaceRepository,
        this.marketplaceDistributionRepository,
        this.deploymentsServices.getPackageService(),
        this.spacesPort,
        this.gitPort,
        this.gitRepoService,
        this.marketplaceDescriptorParserRegistry,
        ports.eventEmitterService,
        this.deploymentsDelayedJobs.publishPluginToMarketplaceDelayedJob,
        this.accountsPort,
      );

    this._listMarketplaceDistributionsForPackageUseCase =
      new ListMarketplaceDistributionsForPackageUseCase(
        this.marketplaceDistributionRepository,
        this.deploymentsServices.getPackageService(),
        this.spacesPort,
        this.accountsPort,
      );

    // Plugin removal use cases (gated behind marketplace-plugin-removal flag
    // on the frontend; backend remains symmetric to link/unlink).
    this._markPluginForRemovalUseCase = new MarkPluginForRemovalUseCase(
      this.marketplaceRepository,
      this.marketplaceDistributionRepository,
      this.deploymentsServices.getPackageService(),
      ports.eventEmitterService,
      this.deploymentsDelayedJobs.removePluginFromMarketplaceDelayedJob,
      this.accountsPort,
    );

    this._cancelPluginRemovalUseCase = new CancelPluginRemovalUseCase(
      this.marketplaceRepository,
      this.marketplaceDistributionRepository,
      this.accountsPort,
    );

    // On-demand "Sync now" reconciliation (member-scoped). Reuses the
    // reconciliation job so a manual refresh runs the same sweep as the cron.
    this._syncMarketplaceNowUseCase = new SyncMarketplaceNowUseCase(
      this.marketplaceRepository,
      this.deploymentsDelayedJobs.marketplaceReconciliationDelayedJob,
      this.accountsPort,
    );

    this._listMarketplaceDistributionsUseCase =
      new ListMarketplaceDistributionsUseCase(
        this.marketplaceRepository,
        this.marketplaceDistributionRepository,
        this.deploymentsServices.getPackageService(),
        this.accountsPort,
      );
  }

  /**
   * Build delayed jobs from JobsService.
   * This is called internally during initialize().
   */
  private async buildDelayedJobs(
    jobsService: JobsService,
    eventEmitterService: PackmindEventEmitterService,
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

    // Marketplace reconciliation queue — per-marketplace BullMQ repeatable
    // jobs (default `*/30 * * * *`). Registered through the same JobsService
    // so the queue is initialized alongside the rest of the worker pool.
    const reconciliationFactory = new MarketplaceReconciliationJobFactory(
      this.marketplaceRepository,
      this.marketplaceDistributionRepository,
      this.gitRepoService,
      this.gitPort!,
      this.marketplaceDescriptorParserRegistry,
    );
    jobsService.registerJobQueue(
      reconciliationFactory.getQueueName(),
      reconciliationFactory,
    );
    await reconciliationFactory.createQueue();

    if (!reconciliationFactory.delayedJob) {
      throw new Error(
        'DeploymentsAdapter: Failed to create delayed job for marketplace reconciliation',
      );
    }

    // Marketplace plugin publish queue. The worker is intentionally
    // single-concurrency — Git pushes onto the rolling `packmind/sync` branch
    // must be serialized across simultaneous publish attempts. The renderer
    // is provided as a lazy callable so it can reach the
    // `RenderPackageAsPluginUseCase` that is constructed later in
    // `initialize()`.
    const publishPluginToMarketplaceFactory =
      new PublishPluginToMarketplaceJobFactory(
        this.marketplaceDistributionRepository,
        this.marketplaceRepository,
        this.deploymentsServices.getPackageService(),
        this.gitRepoService,
        this.gitPort!,
        this.marketplaceDescriptorParserRegistry,
        async (params) => this.renderPluginForPublishJob(params),
        eventEmitterService,
      );
    jobsService.registerJobQueue(
      publishPluginToMarketplaceFactory.getQueueName(),
      publishPluginToMarketplaceFactory,
    );
    await publishPluginToMarketplaceFactory.createQueue();

    if (!publishPluginToMarketplaceFactory.delayedJob) {
      throw new Error(
        'DeploymentsAdapter: Failed to create delayed job for publish plugin to marketplace',
      );
    }

    // Marketplace plugin removal queue — the inverse of the publish queue.
    // Also single-concurrency: deletion commits onto `packmind/sync` must be
    // serialized with publishes. No renderer is needed (we delete the
    // plugin's files rather than render them).
    const removePluginFromMarketplaceFactory =
      new RemovePluginFromMarketplaceJobFactory(
        this.marketplaceDistributionRepository,
        this.marketplaceRepository,
        this.gitRepoService,
        this.gitPort!,
        this.marketplaceDescriptorParserRegistry,
      );
    jobsService.registerJobQueue(
      removePluginFromMarketplaceFactory.getQueueName(),
      removePluginFromMarketplaceFactory,
    );
    await removePluginFromMarketplaceFactory.createQueue();

    if (!removePluginFromMarketplaceFactory.delayedJob) {
      throw new Error(
        'DeploymentsAdapter: Failed to create delayed job for remove plugin from marketplace',
      );
    }

    this.logger.debug('Deployments delayed jobs built successfully');
    return {
      publishArtifactsDelayedJob: jobFactory.delayedJob,
      marketplaceReconciliationDelayedJob: reconciliationFactory.delayedJob,
      publishPluginToMarketplaceDelayedJob:
        publishPluginToMarketplaceFactory.delayedJob,
      removePluginFromMarketplaceDelayedJob:
        removePluginFromMarketplaceFactory.delayedJob,
    };
  }

  /**
   * Exposes the marketplace plugin removal job so the cross-cutting
   * `PackageDeletedDistributionsListener` (constructed in `DeploymentsHexa`)
   * can enqueue deletions for the package-deletion cascade. Available only
   * after `initialize()` has built the delayed jobs.
   */
  public getRemovePluginFromMarketplaceJob(): RemovePluginFromMarketplaceDelayedJob {
    if (!this.deploymentsDelayedJobs) {
      throw new Error(
        'DeploymentsAdapter: delayed jobs not initialized — call initialize() first',
      );
    }
    return this.deploymentsDelayedJobs.removePluginFromMarketplaceDelayedJob;
  }

  /**
   * Renderer callable used by the `PublishPluginToMarketplaceDelayedJob`.
   *
   * Wraps `RenderPackageAsPluginUseCase` so the job spec stays decoupled from
   * the rendering hexagon. The package is resolved via the existing
   * `@<space-slug>/<package-slug>` selector to keep the rendering path
   * consistent across surfaces.
   */
  private async renderPluginForPublishJob(params: {
    package: import('@packmind/types').Package;
    userId: string;
    organizationId: string;
  }): Promise<
    import('../jobs/PublishPluginToMarketplaceDelayedJob').PluginRendererResult
  > {
    if (!this.spacesPort) {
      throw new Error(
        'DeploymentsAdapter: SpacesPort missing — renderer cannot run',
      );
    }
    const space = await this.spacesPort.getSpaceById(params.package.spaceId);
    if (!space) {
      throw new Error(
        `Space ${params.package.spaceId} not found for package ${params.package.slug}`,
      );
    }
    const slug = `@${space.slug}/${params.package.slug}`;
    const pluginRoot = `plugins/${params.package.slug}`;

    const response = await this._renderPackageAsPluginUseCase.execute({
      userId: params.userId,
      organizationId: params.organizationId,
      packageSlug: slug,
      mode: 'marketplace',
      pluginRoot,
      pluginName: params.package.name,
    });

    const marketplacePluginDescription = formatMarketplacePluginDescription({
      spaceSlug: space.slug,
      packageDescription: response.pluginDescription,
    });

    return {
      files: response.files.map((f) => ({ path: f.path, content: f.content })),
      pluginName: response.pluginName,
      pluginVersion: response.pluginVersion,
      pluginDescription: marketplacePluginDescription,
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

  async addTarget(command: AddTargetCommand): Promise<Target> {
    return this._addTargetUseCase.execute(command);
  }

  async getTargetById(
    command: GetTargetByIdCommand,
  ): Promise<GetTargetByIdResponse> {
    return this._getTargetByIdUseCase.execute(command);
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

  async installPackages(
    command: InstallPackagesCommand,
  ): Promise<InstallPackagesResponse> {
    return this._installPackagesUseCase.execute(command);
  }

  async renderPackageAsPlugin(
    command: RenderPackageAsPluginCommand,
  ): Promise<RenderPackageAsPluginResponse> {
    return this._renderPackageAsPluginUseCase.execute(command);
  }

  async trackPluginDeleted(
    command: TrackPluginDeletedCommand,
  ): Promise<TrackPluginDeletedResponse> {
    return this._trackPluginDeletedUseCase.execute(command);
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

  async notifyArtefactsDistribution(
    command: NotifyArtefactsDistributionCommand,
  ): Promise<NotifyArtefactsDistributionResponse> {
    return this._notifyArtefactsDistributionUseCase.execute(command);
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

  async downloadDefaultSkillsZipForAgent(
    command: DownloadDefaultSkillsZipForAgentCommand,
  ): Promise<DownloadDefaultSkillsZipForAgentResponse> {
    return this._downloadDefaultSkillsZipForAgentUseCase.execute(command);
  }

  async downloadSkillZipForAgent(
    command: DownloadSkillZipForAgentCommand,
  ): Promise<DownloadSkillZipForAgentResponse> {
    return this._downloadSkillZipForAgentUseCase.execute(command);
  }

  async getDeployedContent(
    command: GetDeployedContentCommand,
  ): Promise<GetDeployedContentResponse> {
    return this._getDeployedContentUseCase.execute(command);
  }

  async getContentByVersions(
    command: GetContentByVersionsCommand,
  ): Promise<GetContentByVersionsResponse> {
    return this._getContentByVersionsUseCase.execute(command);
  }

  async getDashboardKpi(
    command: GetDashboardKpiCommand,
  ): Promise<DashboardKpiResponse> {
    return this._getDashboardKpiUseCase.execute(command);
  }

  async getDashboardNonLive(
    command: GetDashboardNonLiveCommand,
  ): Promise<DashboardNonLiveResponse> {
    return this._getDashboardNonLiveUseCase.execute(command);
  }

  listActiveDistributedPackagesBySpace(
    command: ListActiveDistributedPackagesBySpaceCommand,
  ): Promise<ListActiveDistributedPackagesBySpaceResponse> {
    return this._listActiveDistributedPackagesBySpaceUseCase.execute(command);
  }

  getListActiveDistributedPackagesBySpaceUseCase(): IListActiveDistributedPackagesBySpaceUseCase {
    return this._listActiveDistributedPackagesBySpaceUseCase;
  }

  async linkMarketplace(
    command: LinkMarketplaceCommand,
  ): Promise<LinkMarketplaceResponse> {
    return this._linkMarketplaceUseCase.execute(command);
  }

  async unlinkMarketplace(
    command: UnlinkMarketplaceCommand,
  ): Promise<UnlinkMarketplaceResponse> {
    return this._unlinkMarketplaceUseCase.execute(command);
  }

  async listMarketplaces(
    command: ListMarketplacesCommand,
  ): Promise<ListMarketplacesResponse> {
    return this._listMarketplacesUseCase.execute(command);
  }

  async validateMarketplaceUrl(
    command: ValidateMarketplaceUrlCommand,
  ): Promise<ValidateMarketplaceUrlResponse> {
    return this._validateMarketplaceUrlUseCase.execute(command);
  }

  async publishPackageOnMarketplace(
    command: PublishPackageOnMarketplaceCommand,
  ): Promise<PublishPackageOnMarketplaceResponse> {
    return this._publishPackageOnMarketplaceUseCase.execute(command);
  }

  async listMarketplaceDistributionsForPackage(
    command: ListMarketplaceDistributionsForPackageCommand,
  ): Promise<ListMarketplaceDistributionsForPackageResponse> {
    return this._listMarketplaceDistributionsForPackageUseCase.execute(command);
  }

  async findMarketplaceDistributionById(
    command: FindMarketplaceDistributionByIdCommand,
  ): Promise<FindMarketplaceDistributionByIdResponse> {
    const row = await this.marketplaceDistributionRepository.findById(
      command.marketplaceDistributionId,
    );
    if (!row || row.organizationId !== command.organizationId) {
      return { marketplaceDistribution: null };
    }
    return { marketplaceDistribution: row };
  }

  async markPluginForRemoval(
    command: MarkPluginForRemovalCommand,
  ): Promise<MarkPluginForRemovalResponse> {
    return this._markPluginForRemovalUseCase.execute(command);
  }

  async cancelPluginRemoval(
    command: CancelPluginRemovalCommand,
  ): Promise<CancelPluginRemovalResponse> {
    return this._cancelPluginRemovalUseCase.execute(command);
  }

  async syncMarketplaceNow(
    command: SyncMarketplaceNowCommand,
  ): Promise<SyncMarketplaceNowResponse> {
    return this._syncMarketplaceNowUseCase.execute(command);
  }

  async listMarketplaceDistributions(
    command: ListMarketplaceDistributionsCommand,
  ): Promise<ListMarketplaceDistributionsResponse> {
    return this._listMarketplaceDistributionsUseCase.execute(command);
  }
}
