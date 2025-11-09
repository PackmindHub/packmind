import {
  UserProvider,
  OrganizationProvider,
  IPullAllContentResponse,
  PackmindCommand,
} from '@packmind/types';
import { IDeploymentPort, ISpacesPort } from '@packmind/types';
import { IRecipesPort } from '@packmind/types';
import { DeleteTargetResponse } from '@packmind/types';
import {
  FindDeployedStandardByRepositoryCommand,
  FindDeployedStandardByRepositoryResponse,
  FindActiveStandardVersionsByTargetCommand,
  FindActiveStandardVersionsByTargetResponse,
  GetStandardDeploymentOverviewCommand,
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
  GetTargetsByGitRepoCommand,
  GetTargetsByRepositoryCommand,
  GetTargetsByOrganizationCommand,
  GetRenderModeConfigurationCommand,
  GetRenderModeConfigurationResult,
  CreateRenderModeConfigurationCommand,
  UpdateRenderModeConfigurationCommand,
  RenderModeConfiguration,
} from '@packmind/types';
import { FindDeployedStandardByRepositoryUseCase } from '../useCases/FindDeployedStandardByRepositoryUseCase';
import { FindActiveStandardVersionsByTargetUseCase } from '../useCases/FindActiveStandardVersionsByTargetUseCase';
import { IStandardsDeploymentRepository } from '../../domain/repositories/IStandardsDeploymentRepository';
import { DeploymentsServices } from '../services/DeploymentsServices';
import {
  DeploymentOverview,
  GetDeploymentOverviewCommand,
} from '@packmind/types';
import { GetDeploymentOverviewUseCase } from '../useCases/GetDeploymentOverviewUseCase';
import { IRecipesDeploymentRepository } from '../../domain/repositories/IRecipesDeploymentRepository';
import { IGitPort } from '@packmind/types';
import { PublishRecipesUseCase } from '../useCases/PublishRecipesUseCase';
import { ICodingAgentPort, IStandardsPort } from '@packmind/types';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { PublishStandardsUseCase } from '../useCases/PublishStandardsUseCase';
import { ListDeploymentsByRecipeUseCase } from '../useCases/ListDeploymentsByRecipeUseCase';
import { ListDeploymentsByStandardUseCase } from '../useCases/ListDeploymentsByStandardUseCase';
import { GetStandardDeploymentOverviewUseCase } from '../useCases/GetStandardDeploymentOverviewUseCase';
import { AddTargetUseCase } from '../useCases/AddTargetUseCase';
import { GetTargetsByGitRepoUseCase } from '../useCases/GetTargetsByGitRepoUseCase';
import { GetTargetsByRepositoryUseCase } from '../useCases/GetTargetsByRepositoryUseCase';
import { GetTargetsByOrganizationUseCase } from '../useCases/GetTargetsByOrganizationUseCase';
import { UpdateTargetUseCase } from '../useCases/UpdateTargetUseCase';
import { DeleteTargetUseCase } from '../useCases/DeleteTargetUseCase';
import { GetRenderModeConfigurationUseCase } from '../useCases/GetRenderModeConfigurationUseCase';
import { CreateRenderModeConfigurationUseCase } from '../useCases/CreateRenderModeConfigurationUseCase';
import { UpdateRenderModeConfigurationUseCase } from '../useCases/UpdateRenderModeConfigurationUseCase';
import { PullAllContentUseCase } from '../useCases/PullAllContentUseCase';

// Import the type to avoid circular dependency
type DeploymentsHexaType = {
  repositories: {
    getStandardsDeploymentRepository(): IStandardsDeploymentRepository;
    getRecipesDeploymentRepository(): IRecipesDeploymentRepository;
  };
};

export class DeploymentsAdapter implements IDeploymentPort {
  private readonly standardDeploymentRepository: IStandardsDeploymentRepository;
  private readonly recipesDeploymentRepository: IRecipesDeploymentRepository;
  private deploymentsServices!: DeploymentsServices;
  private gitPort!: IGitPort;
  private recipesPort?: Partial<IRecipesPort>;
  private codingAgentPort!: ICodingAgentPort;
  private standardsPort?: IStandardsPort; // Optional - may be set after initialization
  private codingAgentHexa!: CodingAgentHexa; // Keep for getCodingAgentDeployerRegistry() - not in port
  private spacesPort!: ISpacesPort;
  private userProvider?: UserProvider;
  private organizationProvider?: OrganizationProvider;

  constructor(deploymentsHexa: DeploymentsHexaType) {
    this.standardDeploymentRepository =
      deploymentsHexa.repositories.getStandardsDeploymentRepository();
    this.recipesDeploymentRepository =
      deploymentsHexa.repositories.getRecipesDeploymentRepository();
  }

  /**
   * Set the git port for use cases that depend on it
   */
  public setGitPort(gitPort: IGitPort): void {
    this.gitPort = gitPort;
  }

  /**
   * Update the deployments services (called when services are created with ports)
   */
  public updateDeploymentsServices(services: DeploymentsServices): void {
    this.deploymentsServices = services;
  }

  /**
   * Set the coding agent port for use cases that depend on it
   */
  public setCodingAgentPort(codingAgentPort: ICodingAgentPort): void {
    this.codingAgentPort = codingAgentPort;
  }

  /**
   * Set the coding agent hexa for use cases that depend on it
   */
  public setCodingAgentHexa(codingAgentHexa: CodingAgentHexa): void {
    this.codingAgentHexa = codingAgentHexa;
  }

  /**
   * Update the recipes port for use cases that depend on it
   */
  public updateRecipesPort(recipesPort: Partial<IRecipesPort>): void {
    this.recipesPort = recipesPort;
  }

  /**
   * Update the spaces port for use cases that depend on it
   */
  public updateSpacesPort(spacesPort: ISpacesPort): void {
    this.spacesPort = spacesPort;
  }

  /**
   * Update the standards port for use cases that depend on it
   */
  public updateStandardsPort(standardsPort: IStandardsPort): void {
    this.standardsPort = standardsPort;
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
    if (!this.standardsPort) {
      throw new Error(
        'StandardsPort not available - call setStandardsPort first',
      );
    }
    const useCase = new PublishStandardsUseCase(
      this.standardsPort,
      this.gitPort,
      this.codingAgentPort,
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
      this.gitPort,
      this.recipesPort,
      this.codingAgentPort,
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
      this.gitPort,
    );

    const useCase = new GetDeploymentOverviewUseCase(
      this.recipesDeploymentRepository,
      this.recipesPort,
      this.spacesPort,
      this.gitPort,
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
    if (!this.standardsPort) {
      throw new Error(
        'StandardsPort not available - call setStandardsPort first',
      );
    }
    const useCase = new GetStandardDeploymentOverviewUseCase(
      this.standardDeploymentRepository,
      this.standardsPort,
      this.gitPort,
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
      this.gitPort,
    );
    return useCase.execute(command);
  }

  async getTargetsByOrganization(
    command: GetTargetsByOrganizationCommand,
  ): Promise<TargetWithRepository[]> {
    const useCase = new GetTargetsByOrganizationUseCase(
      this.deploymentsServices.getTargetService(),
      this.gitPort,
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

  async pullAllContent(
    command: PackmindCommand,
  ): Promise<IPullAllContentResponse> {
    if (!this.recipesPort) {
      throw new Error('RecipesPort not available - cannot pull all content');
    }
    if (!this.spacesPort) {
      throw new Error('SpacesPort not available - cannot pull all content');
    }
    if (!this.userProvider || !this.organizationProvider) {
      throw new Error(
        'Account providers not configured - cannot pull all content',
      );
    }
    if (!this.standardsPort) {
      throw new Error(
        'StandardsPort not available - call setStandardsPort first',
      );
    }
    const standardsPort = this.standardsPort; // Store in local variable for type narrowing

    const useCase = new PullAllContentUseCase(
      this.recipesPort as IRecipesPort,
      standardsPort,
      this.spacesPort,
      this.codingAgentPort,
      this.codingAgentHexa,
      this.userProvider,
      this.organizationProvider,
    );
    return useCase.execute(command);
  }
}
