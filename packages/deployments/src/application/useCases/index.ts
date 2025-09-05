import {
  FindDeployedStandardByRepositoryCommand,
  FindDeployedStandardByRepositoryResponse,
  GetStandardDeploymentOverviewCommand,
  IDeploymentPort,
  ListDeploymentsByRecipeCommand,
  ListDeploymentsByStandardCommand,
  PublishRecipesCommand,
  PublishStandardsCommand,
  RecipesDeployment,
  StandardDeploymentOverview,
  StandardsDeployment,
} from '@packmind/shared';
import { FindDeployedStandardByRepositoryUseCase } from './FindDeployedStandardByRepositoryUseCase';
import { IStandardsDeploymentRepository } from '../../domain/repositories/IStandardsDeploymentRepository';
import { DeploymentsHexaFactory } from '../../DeploymentsHexaFactory';
import {
  DeploymentOverview,
  GetDeploymentOverviewCommand,
} from '@packmind/shared';
import { GetDeploymentOverviewUseCase } from './GetDeploymentOverviewUseCase';
import { IRecipesDeploymentRepository } from '../../domain/repositories/IRecipesDeploymentRepository';
import { GitHexa } from '@packmind/git';
import { RecipesHexa } from '@packmind/recipes';
import { PublishRecipesUseCase } from './PublishRecipesUseCase';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { PublishStandardsUseCase } from './PublishStandardsUseCase';
import { StandardsHexa } from '@packmind/standards';
import { ListDeploymentsByRecipeUseCase } from './ListDeploymentsByRecipeUseCase';
import { ListDeploymentsByStandardUseCase } from './ListDeploymentsByStandardUseCase';
import { GetStandardDeploymentOverviewUseCase } from './GetStandardDeploymentOverviewUseCase';

export class DeploymentsUseCases implements IDeploymentPort {
  private readonly standardDeploymentRepository: IStandardsDeploymentRepository;
  private readonly recipesDeploymentRepository: IRecipesDeploymentRepository;
  private gitHexa: GitHexa;
  private recipesHexa: RecipesHexa;
  private codingAgentHexa: CodingAgentHexa;
  private standardsHexa: StandardsHexa;

  constructor(
    deploymentsHexa: DeploymentsHexaFactory,
    gitHexa: GitHexa,
    recipesHexa: RecipesHexa,
    codingAgentHexa: CodingAgentHexa,
    standardsHexa: StandardsHexa,
  ) {
    this.standardDeploymentRepository =
      deploymentsHexa.repositories.standardsDeployment;
    this.recipesDeploymentRepository =
      deploymentsHexa.repositories.recipesDeployment;

    //TODO: refactor using adapter pattern
    this.gitHexa = gitHexa;
    this.recipesHexa = recipesHexa;
    this.codingAgentHexa = codingAgentHexa;
    this.standardsHexa = standardsHexa;
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
  ): Promise<StandardsDeployment> {
    const useCase = new PublishStandardsUseCase(
      this.standardsHexa,
      this.gitHexa,
      this.codingAgentHexa,
      this.standardDeploymentRepository,
    );
    return useCase.execute(command);
  }

  publishRecipes(command: PublishRecipesCommand): Promise<RecipesDeployment[]> {
    const useCase = new PublishRecipesUseCase(
      this.recipesDeploymentRepository,
      this.gitHexa,
      this.recipesHexa,
      this.codingAgentHexa,
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
    const useCase = new GetDeploymentOverviewUseCase(
      this.recipesDeploymentRepository,
      this.recipesHexa,
      this.gitHexa,
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
}
