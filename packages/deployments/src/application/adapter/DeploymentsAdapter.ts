import {
  IBaseAdapter,
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
  DeploymentOverview,
  Distribution,
  FindActiveStandardVersionsByTargetCommand,
  FindActiveStandardVersionsByTargetResponse,
  FindDeployedStandardByRepositoryCommand,
  FindDeployedStandardByRepositoryResponse,
  GetDeploymentOverviewCommand,
  GetPackageByIdCommand,
  GetPackageByIdResponse,
  GetPackageSummaryCommand,
  GetPackageSummaryResponse,
  GetRenderModeConfigurationCommand,
  GetRenderModeConfigurationResult,
  GetStandardDeploymentOverviewCommand,
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
  ISpacesPort,
  ISpacesPortName,
  IStandardsPort,
  IStandardsPortName,
  ListDeploymentsByRecipeCommand,
  ListDeploymentsByStandardCommand,
  ListDeploymentsByPackageCommand,
  ListDistributionsByRecipeCommand,
  ListDistributionsByStandardCommand,
  ListPackagesCommand,
  ListPackagesResponse,
  ListPackagesBySpaceCommand,
  ListPackagesBySpaceResponse,
  PackagesDeployment,
  PublishArtifactsCommand,
  PublishArtifactsResponse,
  PublishPackagesCommand,
  PullContentCommand,
  RecipesDeployment,
  RenderModeConfiguration,
  StandardDeploymentOverview,
  StandardsDeployment,
  Target,
  TargetWithRepository,
  UpdateRenderModeConfigurationCommand,
  UpdateTargetCommand,
} from '@packmind/types';
import { IRecipesDeploymentRepository } from '../../domain/repositories/IRecipesDeploymentRepository';
import { IStandardsDeploymentRepository } from '../../domain/repositories/IStandardsDeploymentRepository';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { IDistributedPackageRepository } from '../../domain/repositories/IDistributedPackageRepository';
import { DeploymentsServices } from '../services/DeploymentsServices';
import { AddArtefactsToPackageUsecase } from '../useCases/addArtefactsToPackage/addArtefactsToPackage.usecase';
import { AddTargetUseCase } from '../useCases/AddTargetUseCase';
import { CreatePackageUsecase } from '../useCases/createPackage/createPackage.usecase';
import { UpdatePackageUsecase } from '../useCases/updatePackage/updatePackage.usecase';
import { CreateRenderModeConfigurationUseCase } from '../useCases/CreateRenderModeConfigurationUseCase';
import { DeletePackagesBatchUsecase } from '../useCases/deletePackage/deletePackagesBatch.usecase';
import { DeleteTargetUseCase } from '../useCases/DeleteTargetUseCase';
import { FindActiveStandardVersionsByTargetUseCase } from '../useCases/FindActiveStandardVersionsByTargetUseCase';
import { FindDeployedStandardByRepositoryUseCase } from '../useCases/FindDeployedStandardByRepositoryUseCase';
import { GetDeploymentOverviewUseCase } from '../useCases/GetDeploymentOverviewUseCase';
import { GetPackageByIdUsecase } from '../useCases/getPackageById/getPackageById.usecase';
import { GetRenderModeConfigurationUseCase } from '../useCases/GetRenderModeConfigurationUseCase';
import { GetStandardDeploymentOverviewUseCase } from '../useCases/GetStandardDeploymentOverviewUseCase';
import { GetTargetsByGitRepoUseCase } from '../useCases/GetTargetsByGitRepoUseCase';
import { GetTargetsByOrganizationUseCase } from '../useCases/GetTargetsByOrganizationUseCase';
import { GetTargetsByRepositoryUseCase } from '../useCases/GetTargetsByRepositoryUseCase';
import { ListDeploymentsByRecipeUseCase } from '../useCases/ListDeploymentsByRecipeUseCase';
import { ListDeploymentsByStandardUseCase } from '../useCases/ListDeploymentsByStandardUseCase';
import { ListDeploymentsByPackageUseCase } from '../useCases/ListDeploymentsByPackageUseCase';
import { ListDistributionsByRecipeUseCase } from '../useCases/ListDistributionsByRecipeUseCase';
import { ListDistributionsByStandardUseCase } from '../useCases/ListDistributionsByStandardUseCase';
import { ListPackagesUsecase } from '../useCases/listPackages/listPackages.usecase';
import { ListPackagesBySpaceUsecase } from '../useCases/listPackagesBySpace/listPackagesBySpace.usecase';
import { GetPackageSummaryUsecase } from '../useCases/getPackageSummary/getPackageSummary.usecase';
import { PublishArtifactsUseCase } from '../useCases/PublishArtifactsUseCase';
import { PublishPackagesUseCase } from '../useCases/PublishPackagesUseCase';
import { PullContentUseCase } from '../useCases/PullContentUseCase';
import { UpdateRenderModeConfigurationUseCase } from '../useCases/UpdateRenderModeConfigurationUseCase';
import { UpdateTargetUseCase } from '../useCases/UpdateTargetUseCase';

export class DeploymentsAdapter
  implements IBaseAdapter<IDeploymentPort>, IDeploymentPort
{
  private gitPort: IGitPort | null = null;
  private recipesPort: IRecipesPort | null = null;
  private codingAgentPort: ICodingAgentPort | null = null;
  private standardsPort: IStandardsPort | null = null;
  private spacesPort: ISpacesPort | null = null;
  private accountsPort: IAccountsPort | null = null;

  // Use cases - initialized in initialize()
  private _listDeploymentsByRecipeUseCase!: ListDeploymentsByRecipeUseCase;
  private _publishArtifactsUseCase!: PublishArtifactsUseCase;
  private _publishPackagesUseCase!: PublishPackagesUseCase;
  private _findDeployedStandardByRepositoryUseCase!: FindDeployedStandardByRepositoryUseCase;
  private _findActiveStandardVersionsByTargetUseCase!: FindActiveStandardVersionsByTargetUseCase;
  private _getDeploymentOverviewUseCase!: GetDeploymentOverviewUseCase;
  private _listDeploymentsByStandardUseCase!: ListDeploymentsByStandardUseCase;
  private _listDeploymentsByPackageUseCase!: ListDeploymentsByPackageUseCase;
  private _listDistributionsByRecipeUseCase!: ListDistributionsByRecipeUseCase;
  private _listDistributionsByStandardUseCase!: ListDistributionsByStandardUseCase;
  private _getStandardDeploymentOverviewUseCase!: GetStandardDeploymentOverviewUseCase;
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

  constructor(
    private readonly deploymentsServices: DeploymentsServices,
    private readonly standardDeploymentRepository: IStandardsDeploymentRepository,
    private readonly recipesDeploymentRepository: IRecipesDeploymentRepository,
    private readonly distributionRepository: IDistributionRepository,
    private readonly distributedPackageRepository: IDistributedPackageRepository,
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
    [ISpacesPortName]: ISpacesPort;
    [IAccountsPortName]: IAccountsPort;
    eventEmitterService: PackmindEventEmitterService;
  }): Promise<void> {
    // Step 1: Set all ports
    this.gitPort = ports[IGitPortName];
    this.recipesPort = ports[IRecipesPortName];
    this.codingAgentPort = ports[ICodingAgentPortName];
    this.standardsPort = ports[IStandardsPortName];
    this.spacesPort = ports[ISpacesPortName];
    this.accountsPort = ports[IAccountsPortName];

    // Step 2: Validate all required ports are set
    if (
      !this.gitPort &&
      !this.recipesPort &&
      !this.codingAgentPort &&
      !this.standardsPort &&
      !this.spacesPort &&
      !this.accountsPort &&
      !this.deploymentsServices
    ) {
      throw new Error('DeploymentsAdapter: Required ports not provided');
    }

    // Step 3: Create all use cases with non-null ports
    this._listDeploymentsByRecipeUseCase = new ListDeploymentsByRecipeUseCase(
      this.recipesDeploymentRepository,
    );

    this._publishArtifactsUseCase = new PublishArtifactsUseCase(
      this.recipesPort,
      this.standardsPort,
      this.gitPort,
      this.codingAgentPort,
      this.recipesDeploymentRepository,
      this.standardDeploymentRepository,
      this.deploymentsServices.getTargetService(),
      this.deploymentsServices.getRenderModeConfigurationService(),
      ports.eventEmitterService,
    );

    this._publishPackagesUseCase = new PublishPackagesUseCase(
      this.recipesPort,
      this.standardsPort,
      this,
      this.deploymentsServices.getPackageService(),
      this.distributionRepository,
      this.distributedPackageRepository,
    );

    this._findDeployedStandardByRepositoryUseCase =
      new FindDeployedStandardByRepositoryUseCase(
        this.standardDeploymentRepository,
      );

    this._findActiveStandardVersionsByTargetUseCase =
      new FindActiveStandardVersionsByTargetUseCase(
        this.standardDeploymentRepository,
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

    this._listDeploymentsByStandardUseCase =
      new ListDeploymentsByStandardUseCase(this.standardDeploymentRepository);

    this._listDeploymentsByPackageUseCase = new ListDeploymentsByPackageUseCase(
      this.distributionRepository,
    );

    this._listDistributionsByRecipeUseCase =
      new ListDistributionsByRecipeUseCase(this.distributionRepository);

    this._listDistributionsByStandardUseCase =
      new ListDistributionsByStandardUseCase(this.distributionRepository);

    this._getStandardDeploymentOverviewUseCase =
      new GetStandardDeploymentOverviewUseCase(
        this.distributionRepository,
        this.standardsPort,
        this.gitPort,
        this.spacesPort,
      );

    this._addTargetUseCase = new AddTargetUseCase(
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
    );

    this._deleteTargetUseCase = new DeleteTargetUseCase(
      this.deploymentsServices.getTargetService(),
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
      this.codingAgentPort,
      this.deploymentsServices.getRenderModeConfigurationService(),
      this.accountsPort,
      ports.eventEmitterService,
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
    );

    this._updatePackageUseCase = new UpdatePackageUsecase(
      this.accountsPort,
      this.deploymentsServices,
      this.spacesPort,
      this.recipesPort,
      this.standardsPort,
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
  }

  public isReady(): boolean {
    return (
      this.gitPort != null &&
      this.recipesPort != null &&
      this.codingAgentPort != null &&
      this.standardsPort != null &&
      this.spacesPort != null &&
      this.accountsPort != null &&
      this.deploymentsServices != null
    );
  }

  public getPort(): IDeploymentPort {
    return this as IDeploymentPort;
  }

  listDeploymentsByRecipe(
    command: ListDeploymentsByRecipeCommand,
  ): Promise<RecipesDeployment[]> {
    return this._listDeploymentsByRecipeUseCase.execute(command);
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

  findActiveStandardVersionsByRepository(
    command: FindDeployedStandardByRepositoryCommand,
  ): Promise<FindDeployedStandardByRepositoryResponse> {
    return this._findDeployedStandardByRepositoryUseCase.execute(command);
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

  listDeploymentsByStandard(
    command: ListDeploymentsByStandardCommand,
  ): Promise<StandardsDeployment[]> {
    return this._listDeploymentsByStandardUseCase.execute(command);
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

  getStandardDeploymentOverview(
    command: GetStandardDeploymentOverviewCommand,
  ): Promise<StandardDeploymentOverview> {
    return this._getStandardDeploymentOverviewUseCase.execute(command);
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
}
