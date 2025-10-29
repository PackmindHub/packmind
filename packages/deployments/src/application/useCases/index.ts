import {
  FindDeployedStandardByRepositoryCommand,
  FindDeployedStandardByRepositoryResponse,
  FindActiveStandardVersionsByTargetCommand,
  FindActiveStandardVersionsByTargetResponse,
  GetStandardDeploymentOverviewCommand,
  IDeploymentPort,
  IRecipesPort,
  ISpacesPort,
  ListDeploymentsByRecipeCommand,
  ListDeploymentsByStandardCommand,
  PublishRecipesCommand,
  PublishStandardsCommand,
  RecipesDeployment,
  StandardDeploymentOverview,
  StandardsDeployment,
  Target,
  TargetWithRepository,
  AddTargetCommand,
  UpdateTargetCommand,
  DeleteTargetCommand,
  DeleteTargetResponse,
  GetTargetsByGitRepoCommand,
  GetTargetsByRepositoryCommand,
  GetTargetsByOrganizationCommand,
  GetRenderModeConfigurationCommand,
  GetRenderModeConfigurationResult,
  CreateRenderModeConfigurationCommand,
  UpdateRenderModeConfigurationCommand,
  RenderModeConfiguration,
  UserProvider,
  OrganizationProvider,
} from '@packmind/shared';
import { FindDeployedStandardByRepositoryUseCase } from './FindDeployedStandardByRepositoryUseCase';
import { FindActiveStandardVersionsByTargetUseCase } from './FindActiveStandardVersionsByTargetUseCase';
import { IStandardsDeploymentRepository } from '../../domain/repositories/IStandardsDeploymentRepository';
import { DeploymentsHexaFactory } from '../../DeploymentsHexaFactory';
import { IDeploymentsServices } from '../IDeploymentsServices';
import {
  DeploymentOverview,
  GetDeploymentOverviewCommand,
} from '@packmind/shared';
import { GetDeploymentOverviewUseCase } from './GetDeploymentOverviewUseCase';
import { IRecipesDeploymentRepository } from '../../domain/repositories/IRecipesDeploymentRepository';
import { GitHexa } from '@packmind/git';
import { PublishRecipesUseCase } from './PublishRecipesUseCase';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { PublishStandardsUseCase } from './PublishStandardsUseCase';
import { StandardsHexa } from '@packmind/standards';
import { ListDeploymentsByRecipeUseCase } from './ListDeploymentsByRecipeUseCase';
import { ListDeploymentsByStandardUseCase } from './ListDeploymentsByStandardUseCase';
import { GetStandardDeploymentOverviewUseCase } from './GetStandardDeploymentOverviewUseCase';
import { AddTargetUseCase } from './AddTargetUseCase';
import { GetTargetsByGitRepoUseCase } from './GetTargetsByGitRepoUseCase';
import { GetTargetsByRepositoryUseCase } from './GetTargetsByRepositoryUseCase';
import { GetTargetsByOrganizationUseCase } from './GetTargetsByOrganizationUseCase';
import { UpdateTargetUseCase } from './UpdateTargetUseCase';
import { DeleteTargetUseCase } from './DeleteTargetUseCase';
import { GetRenderModeConfigurationUseCase } from './GetRenderModeConfigurationUseCase';
import { CreateRenderModeConfigurationUseCase } from './CreateRenderModeConfigurationUseCase';
import { UpdateRenderModeConfigurationUseCase } from './UpdateRenderModeConfigurationUseCase';

export class DeploymentsUseCases implements IDeploymentPort {
  private readonly standardDeploymentRepository: IStandardsDeploymentRepository;
  private readonly recipesDeploymentRepository: IRecipesDeploymentRepository;
  private readonly deploymentsServices: IDeploymentsServices;
  private readonly gitHexa: GitHexa;
  private recipesPort?: IRecipesPort;
  private readonly codingAgentHexa: CodingAgentHexa;
  private readonly standardsHexa: StandardsHexa;
  private spacesPort!: ISpacesPort;
  private userProvider?: UserProvider;
  private organizationProvider?: OrganizationProvider;

  constructor(
    deploymentsHexa: DeploymentsHexaFactory,
    gitHexa: GitHexa,
    recipesPort: IRecipesPort | undefined,
    codingAgentHexa: CodingAgentHexa,
    standardsHexa: StandardsHexa,
  ) {
    this.standardDeploymentRepository =
      deploymentsHexa.repositories.standardsDeployment;
    this.recipesDeploymentRepository =
      deploymentsHexa.repositories.recipesDeployment;
    this.deploymentsServices = deploymentsHexa.services.deployments;

    this.gitHexa = gitHexa;
    this.recipesPort = recipesPort; // Optional - using port pattern to avoid circular dependency
    this.codingAgentHexa = codingAgentHexa;
    this.standardsHexa = standardsHexa;
  }

  /**
   * Update the recipes port for use cases that depend on it
   */
  public updateRecipesPort(recipesPort: IRecipesPort): void {
    this.recipesPort = recipesPort;
  }

  /**
   * Update the spaces port for use cases that depend on it
   */
  public updateSpacesPort(spacesPort: ISpacesPort): void {
    this.spacesPort = spacesPort;
  }

  public setAccountProviders(
    userProvider: UserProvider,
    organizationProvider: OrganizationProvider,
  ): void {
    this.userProvider = userProvider;
    this.organizationProvider = organizationProvider;
  }

  listDeploymentsByRecipe(
    command: ListDeploymentsByRecipeCommand,
  ): Promise<RecipesDeployment[]> {
    const useCase = new ListDeploymentsByRecipeUseCase(
      this.recipesDeploymentRepository,
    );
    return useCase.execute(command);
  }

  publishStandards(
    command: PublishStandardsCommand,
  ): Promise<StandardsDeployment[]> {
    const useCase = new PublishStandardsUseCase(
      this.standardsHexa,
      this.gitHexa,
      this.codingAgentHexa,
      this.standardDeploymentRepository,
      this.deploymentsServices.getTargetService(),
      this.deploymentsServices.getRenderModeConfigurationService(),
    );
    return useCase.execute(command);
  }

  publishRecipes(command: PublishRecipesCommand): Promise<RecipesDeployment[]> {
    if (!this.recipesPort) {
      throw new Error('RecipesPort not available - cannot publish recipes');
    }
    const useCase = new PublishRecipesUseCase(
      this.recipesDeploymentRepository,
      this.gitHexa,
      this.recipesPort,
      this.codingAgentHexa,
      this.deploymentsServices.getTargetService(),
      this.deploymentsServices.getRenderModeConfigurationService(),
    );
    return useCase.execute(command);
  }

  findActiveStandardVersionsByRepository(
    command: FindDeployedStandardByRepositoryCommand,
  ): Promise<FindDeployedStandardByRepositoryResponse> {
    const useCase = new FindDeployedStandardByRepositoryUseCase(
      this.standardDeploymentRepository,
    );
    return useCase.execute(command);
  }

  findActiveStandardVersionsByTarget(
    command: FindActiveStandardVersionsByTargetCommand,
  ): Promise<FindActiveStandardVersionsByTargetResponse> {
    const useCase = new FindActiveStandardVersionsByTargetUseCase(
      this.standardDeploymentRepository,
    );
    return useCase.execute(command);
  }

  getDeploymentOverview(
    command: GetDeploymentOverviewCommand,
  ): Promise<DeploymentOverview> {
    if (!this.recipesPort) {
      throw new Error(
        'RecipesPort not available - cannot get deployment overview',
      );
    }
    if (!this.spacesPort) {
      throw new Error(
        'SpacesPort not available - cannot get deployment overview',
      );
    }
    const getTargetsByOrganizationUseCase = new GetTargetsByOrganizationUseCase(
      this.deploymentsServices.getTargetService(),
      this.gitHexa,
    );

    const useCase = new GetDeploymentOverviewUseCase(
      this.recipesDeploymentRepository,
      this.recipesPort,
      this.spacesPort,
      this.gitHexa,
      getTargetsByOrganizationUseCase,
    );
    return useCase.execute(command);
  }

  listDeploymentsByStandard(
    command: ListDeploymentsByStandardCommand,
  ): Promise<StandardsDeployment[]> {
    const useCase = new ListDeploymentsByStandardUseCase(
      this.standardDeploymentRepository,
    );
    return useCase.execute(command);
  }

  getStandardDeploymentOverview(
    command: GetStandardDeploymentOverviewCommand,
  ): Promise<StandardDeploymentOverview> {
    const useCase = new GetStandardDeploymentOverviewUseCase(
      this.standardDeploymentRepository,
      this.standardsHexa,
      this.gitHexa,
      this.spacesPort,
    );
    return useCase.execute(command);
  }

  async addTarget(command: AddTargetCommand): Promise<Target> {
    const useCase = new AddTargetUseCase(
      this.deploymentsServices.getTargetService(),
    );
    return useCase.execute(command);
  }

  async getTargetsByGitRepo(
    command: GetTargetsByGitRepoCommand,
  ): Promise<Target[]> {
    const useCase = new GetTargetsByGitRepoUseCase(
      this.deploymentsServices.getTargetService(),
    );
    return useCase.execute(command);
  }

  async getTargetsByRepository(
    command: GetTargetsByRepositoryCommand,
  ): Promise<TargetWithRepository[]> {
    const useCase = new GetTargetsByRepositoryUseCase(
      this.deploymentsServices.getTargetService(),
      this.gitHexa,
    );
    return useCase.execute(command);
  }

  async getTargetsByOrganization(
    command: GetTargetsByOrganizationCommand,
  ): Promise<TargetWithRepository[]> {
    const useCase = new GetTargetsByOrganizationUseCase(
      this.deploymentsServices.getTargetService(),
      this.gitHexa,
    );
    return useCase.execute(command);
  }

  async updateTarget(command: UpdateTargetCommand): Promise<Target> {
    const useCase = new UpdateTargetUseCase(
      this.deploymentsServices.getTargetService(),
    );
    return useCase.execute(command);
  }

  async deleteTarget(
    command: DeleteTargetCommand,
  ): Promise<DeleteTargetResponse> {
    const useCase = new DeleteTargetUseCase(
      this.deploymentsServices.getTargetService(),
    );
    return useCase.execute(command);
  }

  async getRenderModeConfiguration(
    command: GetRenderModeConfigurationCommand,
  ): Promise<GetRenderModeConfigurationResult> {
    if (!this.userProvider || !this.organizationProvider) {
      throw new Error(
        'Account providers not configured - cannot get render mode configuration',
      );
    }
    const useCase = new GetRenderModeConfigurationUseCase(
      this.deploymentsServices.getRenderModeConfigurationService(),
      this.userProvider,
      this.organizationProvider,
    );
    return useCase.execute(command);
  }

  async createRenderModeConfiguration(
    command: CreateRenderModeConfigurationCommand,
  ): Promise<RenderModeConfiguration> {
    if (!this.userProvider || !this.organizationProvider) {
      throw new Error(
        'Account providers not configured - cannot create render mode configuration',
      );
    }
    const useCase = new CreateRenderModeConfigurationUseCase(
      this.deploymentsServices.getRenderModeConfigurationService(),
      this.userProvider,
      this.organizationProvider,
    );
    return useCase.execute(command);
  }

  async updateRenderModeConfiguration(
    command: UpdateRenderModeConfigurationCommand,
  ): Promise<RenderModeConfiguration> {
    if (!this.userProvider || !this.organizationProvider) {
      throw new Error(
        'Account providers not configured - cannot update render mode configuration',
      );
    }
    const useCase = new UpdateRenderModeConfigurationUseCase(
      this.deploymentsServices.getRenderModeConfigurationService(),
      this.userProvider,
      this.organizationProvider,
    );
    return useCase.execute(command);
  }
}
