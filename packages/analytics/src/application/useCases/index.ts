import { PackmindLogger } from '@packmind/logger';
import {
  GitRepoId,
  IDeploymentPort,
  IGitPort,
  IRecipesPort,
  OrganizationId,
  RecipeId,
  TargetId,
} from '@packmind/types';
import { TimePeriod } from '../../domain/entities/RecipeUsageAnalytics';
import { TrackRecipeUsageCommand } from '../../domain/useCases/ITrackRecipeUsage';
import { RecipesUsageServices } from '../services/RecipesUsageServices';
import {
  GetRecipeUsageAnalyticsParams,
  GetRecipeUsageAnalyticsUsecase,
} from './getRecipeUsageAnalytics/getRecipeUsageAnalytics.usecase';
import { GetUsageByOrganizationUsecase } from './getUsageByOrganization/getUsageByOrganization.usecase';
import { GetUsageByRepositoryUsecase } from './getUsageByRepository/getUsageByRepository.usecase';
import { GetUsageByTargetUsecase } from './getUsageByTarget/getUsageByTarget.usecase';
import { TrackRecipeUsageUsecase } from './trackRecipeUsage/trackRecipeUsage.usecase';

const origin = 'RecipeUsageUseCases';

export class RecipeUsageUseCases {
  private _trackRecipeUsage: TrackRecipeUsageUsecase;
  private readonly _getUsageByOrganization: GetUsageByOrganizationUsecase;
  private readonly _getUsageByRepository: GetUsageByRepositoryUsecase;
  private readonly _getUsageByTarget: GetUsageByTargetUsecase;
  private _getRecipeUsageAnalytics: GetRecipeUsageAnalyticsUsecase;
  private recipesPort?: IRecipesPort;
  private gitPort?: IGitPort;
  private deploymentPort?: IDeploymentPort;

  constructor(
    private readonly recipesUsageServices: RecipesUsageServices,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    // Placeholders that will be replaced when ports are set
    this._trackRecipeUsage = null as unknown as TrackRecipeUsageUsecase;
    this._getRecipeUsageAnalytics =
      null as unknown as GetRecipeUsageAnalyticsUsecase;

    // Use cases that don't depend on ports
    this._getUsageByOrganization = new GetUsageByOrganizationUsecase(
      recipesUsageServices.getRecipeUsageService(),
      this.logger,
    );
    this._getUsageByRepository = new GetUsageByRepositoryUsecase(
      recipesUsageServices.getRecipeUsageService(),
      this.logger,
    );
    this._getUsageByTarget = new GetUsageByTargetUsecase(
      recipesUsageServices.getRecipeUsageService(),
      this.logger,
    );
    this.logger.info('RecipeUseCases initialized successfully');
  }

  public trackRecipeUsage(command: TrackRecipeUsageCommand) {
    if (!this._trackRecipeUsage) {
      throw new Error('RecipesPort not set. Call setRecipesPort() first.');
    }
    return this._trackRecipeUsage.execute(command);
  }

  public getUsageByRecipeId(recipeId: RecipeId) {
    if (!this._trackRecipeUsage) {
      throw new Error('RecipesPort not set. Call setRecipesPort() first.');
    }
    return this._trackRecipeUsage.getUsageByRecipeId(recipeId);
  }

  public getUsageByOrganization(organizationId: OrganizationId) {
    return this._getUsageByOrganization.getUsageByOrganization(organizationId);
  }

  public getUsageByRepository(repositoryId: GitRepoId) {
    return this._getUsageByRepository.getUsageByRepository(repositoryId);
  }

  public getUsageByTarget(targetId: TargetId) {
    return this._getUsageByTarget.getUsageByTarget(targetId);
  }

  public getRecipeUsageAnalytics(params: GetRecipeUsageAnalyticsParams) {
    if (!this._getRecipeUsageAnalytics) {
      throw new Error('RecipesPort not set. Call setRecipesPort() first.');
    }
    return this._getRecipeUsageAnalytics.getRecipeUsageAnalytics(params);
  }

  public getTargetUsageAnalytics(targetId: TargetId, timePeriod?: TimePeriod) {
    if (!this._getRecipeUsageAnalytics) {
      throw new Error('RecipesPort not set. Call setRecipesPort() first.');
    }
    return this._getRecipeUsageAnalytics.getTargetUsageAnalytics(
      targetId,
      timePeriod,
    );
  }

  /**
   * Set the recipes port after initialization to avoid circular dependencies
   */
  public setRecipesPort(recipesPort: IRecipesPort): void {
    this.recipesPort = recipesPort;
    // Update the services with the new recipes port
    this.recipesUsageServices.setRecipesPort(recipesPort);
    // Recreate use cases that depend on recipesPort (only if gitPort is set)
    if (this.gitPort) {
      this._trackRecipeUsage = new TrackRecipeUsageUsecase(
        this.recipesPort,
        this.recipesUsageServices.getRecipeUsageService(),
        this.gitPort,
        this.deploymentPort,
        this.logger,
      );
    }
    this._getRecipeUsageAnalytics = new GetRecipeUsageAnalyticsUsecase(
      this.recipesUsageServices.getRecipeUsageService(),
      this.recipesUsageServices.getRecipeUsageAnalyticsService(),
      this.logger,
    );
  }

  /**
   * Set the git port after initialization
   */
  public setGitPort(gitPort: IGitPort): void {
    this.gitPort = gitPort;
    // Recreate use cases that depend on gitPort if recipesPort is set
    if (this.recipesPort && this.gitPort) {
      this._trackRecipeUsage = new TrackRecipeUsageUsecase(
        this.recipesPort,
        this.recipesUsageServices.getRecipeUsageService(),
        this.gitPort,
        this.deploymentPort,
        this.logger,
      );
    }
  }

  /**
   * Set the deployment port after initialization to avoid circular dependencies
   */
  public setDeploymentPort(deploymentPort: IDeploymentPort): void {
    this.deploymentPort = deploymentPort;
    if (!this.recipesPort || !this.gitPort) {
      // Ports will be set when recipesPort and gitPort are set
      return;
    }
    // Recreate the TrackRecipeUsageUsecase with the deployment port
    this._trackRecipeUsage = new TrackRecipeUsageUsecase(
      this.recipesPort,
      this.recipesUsageServices.getRecipeUsageService(),
      this.gitPort,
      deploymentPort,
      this.logger,
    );
  }
}
