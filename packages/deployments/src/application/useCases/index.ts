import {
  FindDeployedStandardByRepositoryCommand,
  FindDeployedStandardByRepositoryResponse,
  GetStandardDeploymentOverviewCommand,
  IDeploymentPort,
  IRecipesPort,
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
  GetTargetsByRepositoryCommand,
  GetTargetsByOrganizationCommand,
} from '@packmind/shared';
import { FindDeployedStandardByRepositoryUseCase } from './FindDeployedStandardByRepositoryUseCase';
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
import { GetTargetsByRepositoryUseCase } from './GetTargetsByRepositoryUseCase';
import { GetTargetsByOrganizationUseCase } from './GetTargetsByOrganizationUseCase';
import { UpdateTargetUseCase } from './UpdateTargetUseCase';
import { DeleteTargetUseCase } from './DeleteTargetUseCase';

export class DeploymentsUseCases implements IDeploymentPort {
  private readonly standardDeploymentRepository: IStandardsDeploymentRepository;
  private readonly recipesDeploymentRepository: IRecipesDeploymentRepository;
  private readonly deploymentsServices: IDeploymentsServices;
  private readonly gitHexa: GitHexa;
  private recipesPort?: IRecipesPort;
  private readonly codingAgentHexa: CodingAgentHexa;
  private readonly standardsHexa: StandardsHexa;

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

  getDeploymentOverview(
    command: GetDeploymentOverviewCommand,
  ): Promise<DeploymentOverview> {
    if (!this.recipesPort) {
      throw new Error(
        'RecipesPort not available - cannot get deployment overview',
      );
    }
    const getTargetsByOrganizationUseCase = new GetTargetsByOrganizationUseCase(
      this.deploymentsServices.getTargetService(),
      this.gitHexa,
    );

    const useCase = new GetDeploymentOverviewUseCase(
      this.recipesDeploymentRepository,
      this.recipesPort,
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
    );
    return useCase.execute(command);
  }

  async addTarget(command: AddTargetCommand): Promise<Target> {
    const useCase = new AddTargetUseCase(
      this.deploymentsServices.getTargetService(),
    );
    return useCase.execute(command);
  }

  async getTargetsByRepository(
    command: GetTargetsByRepositoryCommand,
  ): Promise<Target[]> {
    const useCase = new GetTargetsByRepositoryUseCase(
      this.deploymentsServices.getTargetService(),
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
}
