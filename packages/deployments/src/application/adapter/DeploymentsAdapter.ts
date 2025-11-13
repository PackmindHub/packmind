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
  IAccountsPort,
  IAccountsPortName,
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

  constructor(
    private readonly deploymentsServices: DeploymentsServices,
    private readonly standardDeploymentRepository: IStandardsDeploymentRepository,
    private readonly recipesDeploymentRepository: IRecipesDeploymentRepository,
  ) {}

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
    [IAccountsPortName]: IAccountsPort;
  }): void {
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

    this._pullAllContentUseCase = new PullAllContentUseCase(
      this.recipesPort,
      this.standardsPort,
      this.spacesPort,
      this.codingAgentPort,
      this.accountsPort,
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
