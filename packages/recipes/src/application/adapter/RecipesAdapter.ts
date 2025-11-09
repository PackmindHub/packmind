import { PackmindLogger } from '@packmind/logger';
import {
  CaptureRecipeCommand,
  DeleteRecipeCommand,
  DeleteRecipesBatchCommand,
  GetRecipeByIdCommand,
  IAccountsPort,
  IDeploymentPort,
  IGitPort,
  IRecipesPort,
  ISpacesPort,
  ListRecipesBySpaceCommand,
  OrganizationId,
  QueryOption,
  RecipeId,
  UpdateRecipeFromUICommand,
  UpdateRecipeFromUIResponse,
  UpdateRecipesFromGitHubCommand,
  UpdateRecipesFromGitLabCommand,
} from '@packmind/types';
import { Recipe } from '../../domain/entities/Recipe';
import { IRecipesDelayedJobs } from '../../domain/jobs/IRecipesDelayedJobs';
import { RecipesServices } from '../services/RecipesServices';
import { CaptureRecipeUsecase } from '../useCases/captureRecipe/captureRecipe.usecase';
import { DeleteRecipeUsecase } from '../useCases/deleteRecipe/deleteRecipe.usecase';
import { DeleteRecipesBatchUsecase } from '../useCases/deleteRecipesBatch/deleteRecipesBatch.usecase';
import { FindRecipeBySlugUsecase } from '../useCases/findRecipeBySlug/findRecipeBySlug.usecase';
import { GetRecipeByIdUsecase } from '../useCases/getRecipeById/getRecipeById.usecase';
import { GetRecipeVersionUsecase } from '../useCases/getRecipeVersion/getRecipeVersion.usecase';
import { ListRecipesByOrganizationUsecase } from '../useCases/listRecipesByOrganization/listRecipesByOrganization.usecase';
import { ListRecipesBySpaceUsecase } from '../useCases/listRecipesBySpace/listRecipesBySpace.usecase';
import { ListRecipeVersionsUsecase } from '../useCases/listRecipeVersions/listRecipeVersions.usecase';
import { UpdateRecipeFromUIUsecase } from '../useCases/updateRecipeFromUI/updateRecipeFromUI.usecase';
import { UpdateRecipesFromGitHubUsecase } from '../useCases/updateRecipesFromGitHub/updateRecipesFromGitHub.usecase';
import { UpdateRecipesFromGitLabUsecase } from '../useCases/updateRecipesFromGitLab/updateRecipesFromGitLab.usecase';

const origin = 'RecipesAdapter';

export class RecipesAdapter implements IRecipesPort {
  private readonly _captureRecipe: CaptureRecipeUsecase;
  private _updateRecipesFromGitHub: UpdateRecipesFromGitHubUsecase;
  private _updateRecipesFromGitLab: UpdateRecipesFromGitLabUsecase;
  private readonly _updateRecipeFromUI: UpdateRecipeFromUIUsecase;
  private readonly _deleteRecipe: DeleteRecipeUsecase;
  private readonly _getRecipeById: GetRecipeByIdUsecase;
  private readonly _findRecipeBySlug: FindRecipeBySlugUsecase;
  private readonly _listRecipesByOrganization: ListRecipesByOrganizationUsecase;
  private readonly _listRecipesBySpace: ListRecipesBySpaceUsecase;
  private readonly _listRecipeVersions: ListRecipeVersionsUsecase;
  private readonly _getRecipeVersion: GetRecipeVersionUsecase;
  private readonly _deleteRecipesBatch: DeleteRecipesBatchUsecase;
  private _recipesDelayedJobs: IRecipesDelayedJobs | null = null;

  constructor(
    private readonly recipesServices: RecipesServices,
    private readonly gitPort: IGitPort,
    private readonly deploymentPort: IDeploymentPort | undefined,
    private readonly accountsAdapter: IAccountsPort,
    private readonly spacesPort: ISpacesPort | null,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this._captureRecipe = new CaptureRecipeUsecase(
      recipesServices.getRecipeService(),
      recipesServices.getRecipeVersionService(),
      recipesServices.getRecipeSummaryService(),
      this.logger,
    );
    this._updateRecipesFromGitHub = new UpdateRecipesFromGitHubUsecase(
      recipesServices.getRecipeService(),
      gitPort,
      this.deploymentPort,
    );
    this._updateRecipesFromGitLab = new UpdateRecipesFromGitLabUsecase(
      recipesServices.getRecipeService(),
      gitPort,
      this.deploymentPort,
    );
    this._updateRecipeFromUI = new UpdateRecipeFromUIUsecase(
      recipesServices.getRecipeService(),
      recipesServices.getRecipeVersionService(),
      recipesServices.getRecipeSummaryService(),
      this.logger,
    );
    this._deleteRecipe = new DeleteRecipeUsecase(
      recipesServices.getRecipeService(),
      recipesServices.getRecipeVersionService(),
      this.logger,
    );
    this._getRecipeById = new GetRecipeByIdUsecase(
      accountsAdapter,
      recipesServices.getRecipeService(),
      spacesPort,
      this.logger,
    );
    this._findRecipeBySlug = new FindRecipeBySlugUsecase(
      recipesServices.getRecipeService(),
      this.logger,
    );
    this._listRecipesByOrganization = new ListRecipesByOrganizationUsecase(
      recipesServices.getRecipeService(),
      this.logger,
    );
    this._listRecipesBySpace = new ListRecipesBySpaceUsecase(
      accountsAdapter,
      recipesServices.getRecipeService(),
      spacesPort,
      this.logger,
    );
    this._listRecipeVersions = new ListRecipeVersionsUsecase(
      recipesServices.getRecipeVersionService(),
      this.logger,
    );
    this._getRecipeVersion = new GetRecipeVersionUsecase(
      recipesServices.getRecipeVersionService(),
      this.logger,
    );
    this._deleteRecipesBatch = new DeleteRecipesBatchUsecase(
      this._deleteRecipe,
      this.logger,
    );

    this.logger.info('RecipesAdapter initialized successfully');
  }

  public captureRecipe(command: CaptureRecipeCommand) {
    return this._captureRecipe.execute(command);
  }

  public async updateRecipeFromUI(
    command: UpdateRecipeFromUICommand,
  ): Promise<UpdateRecipeFromUIResponse> {
    const recipe = await this._updateRecipeFromUI.updateRecipeFromUI({
      recipeId: command.recipeId,
      spaceId: command.spaceId,
      organizationId: command.organizationId,
      name: command.name,
      content: command.content,
      editorUserId: command.userId,
    });
    return { recipe };
  }

  public updateRecipesFromGitHub(command: UpdateRecipesFromGitHubCommand) {
    return this._updateRecipesFromGitHub.execute(command);
  }

  public updateRecipesFromGitLab(command: UpdateRecipesFromGitLabCommand) {
    return this._updateRecipesFromGitLab.execute(command);
  }

  public deleteRecipe(command: DeleteRecipeCommand) {
    return this._deleteRecipe.execute(command);
  }

  /**
   * Get recipe by ID with access control (public API)
   */
  public async getRecipeById(
    command: GetRecipeByIdCommand,
  ): Promise<Recipe | null> {
    const result = await this._getRecipeById.execute(command);
    return result.recipe;
  }

  /**
   * Get recipe by ID without access control (internal use only)
   * Used by UpdateRecipeFromUI and RecipeUsageAnalytics
   */
  public getRecipeByIdInternal(id: RecipeId) {
    return this._getRecipeById.getRecipeById(id);
  }

  public findRecipeBySlug(
    slug: string,
    organizationId: OrganizationId,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ) {
    return this._findRecipeBySlug.findRecipeBySlug(slug, organizationId, opts);
  }

  public listRecipesByOrganization(organizationId: OrganizationId) {
    return this._listRecipesByOrganization.listRecipesByOrganization(
      organizationId,
    );
  }

  /**
   * List recipes by space with access control (public API)
   */
  public async listRecipesBySpace(
    command: ListRecipesBySpaceCommand,
  ): Promise<Recipe[]> {
    const result = await this._listRecipesBySpace.execute(command);
    return result.recipes;
  }

  public listRecipeVersions(recipeId: RecipeId) {
    return this._listRecipeVersions.listRecipeVersions(recipeId);
  }

  public getRecipeVersion(recipeId: RecipeId, version: number) {
    return this._getRecipeVersion.getRecipeVersion(recipeId, version);
  }

  public deleteRecipesBatch(command: DeleteRecipesBatchCommand) {
    return this._deleteRecipesBatch.execute(command);
  }

  public async getRecipeVersionById(id: string) {
    const recipeVersionService = this.recipesServices.getRecipeVersionService();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return recipeVersionService.getRecipeVersionById(id as any);
  }

  /**
   * Update the deployment port for webhook use cases after initialization
   */
  updateDeploymentPort(deploymentPort: IDeploymentPort): void {
    // Need to recreate the webhook use cases with the new deployment port
    this._updateRecipesFromGitHub = new UpdateRecipesFromGitHubUsecase(
      this.recipesServices.getRecipeService(),
      this.gitPort,
      deploymentPort,
    );
    this._updateRecipesFromGitLab = new UpdateRecipesFromGitLabUsecase(
      this.recipesServices.getRecipeService(),
      this.gitPort,
      deploymentPort,
    );

    // Re-inject recipes delayed jobs if they were previously set
    if (this._recipesDelayedJobs) {
      this._updateRecipesFromGitHub.setRecipesDelayedJobs(
        this._recipesDelayedJobs,
      );
      this._updateRecipesFromGitLab.setRecipesDelayedJobs(
        this._recipesDelayedJobs,
      );
    }
  }

  /**
   * Set recipes delayed jobs reference for webhook use cases to enable delayed job access
   */
  setRecipesDelayedJobs(recipesDelayedJobs: IRecipesDelayedJobs): void {
    this._recipesDelayedJobs = recipesDelayedJobs;
    this._updateRecipesFromGitHub.setRecipesDelayedJobs(recipesDelayedJobs);
    this._updateRecipesFromGitLab.setRecipesDelayedJobs(recipesDelayedJobs);
  }
}
