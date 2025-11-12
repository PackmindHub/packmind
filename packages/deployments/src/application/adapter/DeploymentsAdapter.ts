import { IBaseAdapter } from '@packmind/node-utils';
import {
  AddTargetCommand,
  CreateRenderModeConfigurationCommand,
  DeleteTargetCommand,
  DeleteTargetResponse,
  DeploymentOverview,
  FindActiveStandardVersionsByTargetCommand,
  FindActiveStandardVersionsByTargetResponse,
  FindDeployedStandardByRepositoryCommand,
  FindDeployedStandardByRepositoryResponse,
  GetDeploymentOverviewCommand,
  GetRenderModeConfigurationCommand,
  GetRenderModeConfigurationResult,
  GetStandardDeploymentOverviewCommand,
  GetTargetsByGitRepoCommand,
  GetTargetsByOrganizationCommand,
  GetTargetsByRepositoryCommand,
  ICodingAgentPort,
  ICodingAgentPortName,
  IDeploymentPort,
  IGitPort,
  IGitPortName,
  IPullAllContentResponse,
  IRecipesPort,
  IRecipesPortName,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPort,
  IStandardsPortName,
  ListDeploymentsByRecipeCommand,
  ListDeploymentsByStandardCommand,
  OrganizationProvider,
  PackmindCommand,
  PublishRecipesCommand,
  PublishStandardsCommand,
  RecipesDeployment,
  RenderModeConfiguration,
  StandardDeploymentOverview,
  StandardsDeployment,
  Target,
  TargetWithRepository,
  UpdateRenderModeConfigurationCommand,
  UpdateTargetCommand,
  UserProvider,
} from '@packmind/types';
import { IRecipesDeploymentRepository } from '../../domain/repositories/IRecipesDeploymentRepository';
import { IStandardsDeploymentRepository } from '../../domain/repositories/IStandardsDeploymentRepository';
import { DeploymentsServices } from '../services/DeploymentsServices';
import { AddTargetUseCase } from '../useCases/AddTargetUseCase';
import { CreateRenderModeConfigurationUseCase } from '../useCases/CreateRenderModeConfigurationUseCase';
import { DeleteTargetUseCase } from '../useCases/DeleteTargetUseCase';
import { FindActiveStandardVersionsByTargetUseCase } from '../useCases/FindActiveStandardVersionsByTargetUseCase';
import { FindDeployedStandardByRepositoryUseCase } from '../useCases/FindDeployedStandardByRepositoryUseCase';
import { GetDeploymentOverviewUseCase } from '../useCases/GetDeploymentOverviewUseCase';
import { GetRenderModeConfigurationUseCase } from '../useCases/GetRenderModeConfigurationUseCase';
import { GetStandardDeploymentOverviewUseCase } from '../useCases/GetStandardDeploymentOverviewUseCase';
import { GetTargetsByGitRepoUseCase } from '../useCases/GetTargetsByGitRepoUseCase';
import { GetTargetsByOrganizationUseCase } from '../useCases/GetTargetsByOrganizationUseCase';
import { GetTargetsByRepositoryUseCase } from '../useCases/GetTargetsByRepositoryUseCase';
import { ListDeploymentsByRecipeUseCase } from '../useCases/ListDeploymentsByRecipeUseCase';
import { ListDeploymentsByStandardUseCase } from '../useCases/ListDeploymentsByStandardUseCase';
import { PublishRecipesUseCase } from '../useCases/PublishRecipesUseCase';
import { PublishStandardsUseCase } from '../useCases/PublishStandardsUseCase';
import { PullAllContentUseCase } from '../useCases/PullAllContentUseCase';
import { UpdateRenderModeConfigurationUseCase } from '../useCases/UpdateRenderModeConfigurationUseCase';
import { UpdateTargetUseCase } from '../useCases/UpdateTargetUseCase';

// Import the type to avoid circular dependency
type DeploymentsHexaType = {
  repositories: {
    getStandardsDeploymentRepository(): IStandardsDeploymentRepository;
    getRecipesDeploymentRepository(): IRecipesDeploymentRepository;
  };
};

export class DeploymentsAdapter
  implements IBaseAdapter<IDeploymentPort>, IDeploymentPort
{
  private readonly standardDeploymentRepository: IStandardsDeploymentRepository;
  private readonly recipesDeploymentRepository: IRecipesDeploymentRepository;

  // All ports are REQUIRED - no optional syntax
  // Use definite assignment (!) - initialized in initialize()
  private deploymentsServices!: DeploymentsServices;
  private gitPort!: IGitPort;
  private recipesPort!: IRecipesPort;
  private codingAgentPort!: ICodingAgentPort;
  private standardsPort!: IStandardsPort;
  private spacesPort!: ISpacesPort;
  private userProvider!: UserProvider;
  private organizationProvider!: OrganizationProvider;

  // Use cases - initialized in initialize()
  private _listDeploymentsByRecipeUseCase!: ListDeploymentsByRecipeUseCase;
  private _publishStandardsUseCase!: PublishStandardsUseCase;
  private _publishRecipesUseCase!: PublishRecipesUseCase;
  private _findDeployedStandardByRepositoryUseCase!: FindDeployedStandardByRepositoryUseCase;
  private _findActiveStandardVersionsByTargetUseCase!: FindActiveStandardVersionsByTargetUseCase;
  private _getDeploymentOverviewUseCase!: GetDeploymentOverviewUseCase;
  private _listDeploymentsByStandardUseCase!: ListDeploymentsByStandardUseCase;
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
  private _pullAllContentUseCase!: PullAllContentUseCase;

  constructor(deploymentsHexa: DeploymentsHexaType) {
    this.standardDeploymentRepository =
      deploymentsHexa.repositories.getStandardsDeploymentRepository();
    this.recipesDeploymentRepository =
      deploymentsHexa.repositories.getRecipesDeploymentRepository();
  }

  /**
   * Initialize adapter with ports and services from registry.
   * All ports and services in signature are REQUIRED.
   */
  public initialize(ports: {
    [IGitPortName]: IGitPort;
    [IRecipesPortName]: IRecipesPort;
    [ICodingAgentPortName]: ICodingAgentPort;
    [IStandardsPortName]: IStandardsPort;
    [ISpacesPortName]: ISpacesPort;
    deploymentsServices: DeploymentsServices;
    userProvider: UserProvider;
    organizationProvider: OrganizationProvider;
  }): void {
    // Step 1: Set all ports
    this.gitPort = ports[IGitPortName];
    this.recipesPort = ports[IRecipesPortName];
    this.codingAgentPort = ports[ICodingAgentPortName];
    this.standardsPort = ports[IStandardsPortName];
    this.spacesPort = ports[ISpacesPortName];
    this.deploymentsServices = ports.deploymentsServices;
    this.userProvider = ports.userProvider;
    this.organizationProvider = ports.organizationProvider;

    // Step 2: Validate all required ports are set
    if (!this.isReady()) {
      throw new Error('DeploymentsAdapter: Required ports not provided');
    }

    // Step 3: Create all use cases with non-null ports
    this._listDeploymentsByRecipeUseCase = new ListDeploymentsByRecipeUseCase(
      this.recipesDeploymentRepository,
    );

    this._publishStandardsUseCase = new PublishStandardsUseCase(
      this.standardsPort,
      this.gitPort,
      this.codingAgentPort,
      this.standardDeploymentRepository,
      this.deploymentsServices.getTargetService(),
      this.deploymentsServices.getRenderModeConfigurationService(),
    );

    this._publishRecipesUseCase = new PublishRecipesUseCase(
      this.recipesDeploymentRepository,
      this.gitPort,
      this.recipesPort,
      this.codingAgentPort,
      this.deploymentsServices.getTargetService(),
      this.deploymentsServices.getRenderModeConfigurationService(),
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
      this.recipesDeploymentRepository,
      this.recipesPort,
      this.spacesPort,
      this.gitPort,
      getTargetsByOrganizationUseCase,
    );

    this._listDeploymentsByStandardUseCase =
      new ListDeploymentsByStandardUseCase(this.standardDeploymentRepository);

    this._getStandardDeploymentOverviewUseCase =
      new GetStandardDeploymentOverviewUseCase(
        this.standardDeploymentRepository,
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
        this.userProvider,
        this.organizationProvider,
      );

    this._createRenderModeConfigurationUseCase =
      new CreateRenderModeConfigurationUseCase(
        this.deploymentsServices.getRenderModeConfigurationService(),
        this.userProvider,
        this.organizationProvider,
      );

    this._updateRenderModeConfigurationUseCase =
      new UpdateRenderModeConfigurationUseCase(
        this.deploymentsServices.getRenderModeConfigurationService(),
        this.userProvider,
        this.organizationProvider,
      );

    this._pullAllContentUseCase = new PullAllContentUseCase(
      this.recipesPort,
      this.standardsPort,
      this.spacesPort,
      this.codingAgentPort,
      this.userProvider,
      this.organizationProvider,
    );
  }

  public isReady(): boolean {
    return (
      this.gitPort !== undefined &&
      this.recipesPort !== undefined &&
      this.codingAgentPort !== undefined &&
      this.standardsPort !== undefined &&
      this.spacesPort !== undefined &&
      this.deploymentsServices !== undefined &&
      this.userProvider !== undefined &&
      this.organizationProvider !== undefined
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

  publishStandards(
    command: PublishStandardsCommand,
  ): Promise<StandardsDeployment[]> {
    return this._publishStandardsUseCase.execute(command);
  }

  publishRecipes(command: PublishRecipesCommand): Promise<RecipesDeployment[]> {
    return this._publishRecipesUseCase.execute(command);
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
    command: PackmindCommand,
  ): Promise<IPullAllContentResponse> {
    return this._pullAllContentUseCase.execute(command);
  }
}
