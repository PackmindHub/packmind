import { CaptureRecipeUsecase } from '../useCases/captureRecipe/captureRecipe.usecase';
import { UpdateRecipesFromGitHubUsecase } from '../useCases/updateRecipesFromGitHub/updateRecipesFromGitHub.usecase';
import { UpdateRecipesFromGitLabUsecase } from '../useCases/updateRecipesFromGitLab/updateRecipesFromGitLab.usecase';
import { UpdateRecipeFromUIUsecase } from '../useCases/updateRecipeFromUI/updateRecipeFromUI.usecase';
import { DeleteRecipeUsecase } from '../useCases/deleteRecipe/deleteRecipe.usecase';
import { GetRecipeByIdUsecase } from '../useCases/getRecipeById/getRecipeById.usecase';
import { FindRecipeBySlugUsecase } from '../useCases/findRecipeBySlug/findRecipeBySlug.usecase';
import { ListRecipesByOrganizationUsecase } from '../useCases/listRecipesByOrganization/listRecipesByOrganization.usecase';
import { ListRecipesBySpaceUsecase } from '../useCases/listRecipesBySpace/listRecipesBySpace.usecase';
import { ListRecipeVersionsUsecase } from '../useCases/listRecipeVersions/listRecipeVersions.usecase';
import { GetRecipeVersionUsecase } from '../useCases/getRecipeVersion/getRecipeVersion.usecase';
import { DeleteRecipesBatchUsecase } from '../useCases/deleteRecipesBatch/deleteRecipesBatch.usecase';
import { IRecipesServices } from '../IRecipesServices';
import {
  CaptureRecipeCommand,
  UpdateRecipesFromGitHubCommand,
  UpdateRecipesFromGitLabCommand,
  PackmindLogger,
  QueryOption,
  IDeploymentPort,
  UserProvider,
  OrganizationProvider,
  ISpacesPort,
  IRecipesPort,
  UpdateRecipeFromUICommand,
  UpdateRecipeFromUIResponse,
} from '@packmind/shared';
import { GitHexa } from '@packmind/git';
import { OrganizationId } from '@packmind/accounts';
import { RecipeId } from '@packmind/shared';
import {
  GetRecipeByIdCommand,
  ListRecipesBySpaceCommand,
} from '@packmind/shared/types';
import { Recipe } from '../../domain/entities/Recipe';
import { RecipesHexa } from '../../RecipesHexa';

import {
  DeleteRecipeCommand,
  DeleteRecipesBatchCommand,
} from '@packmind/shared';

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
  private _recipesHexa: RecipesHexa | null = null;

  constructor(
    private readonly recipesServices: IRecipesServices,
    private readonly gitHexa: GitHexa,
    private readonly deploymentPort: IDeploymentPort | undefined,
    private readonly userProvider: UserProvider,
    private readonly organizationProvider: OrganizationProvider,
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
      gitHexa,
      this.deploymentPort,
    );
    this._updateRecipesFromGitLab = new UpdateRecipesFromGitLabUsecase(
      recipesServices.getRecipeService(),
      gitHexa,
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
      userProvider,
      organizationProvider,
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
      userProvider,
      organizationProvider,
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
    const recipe = await this._updateRecipeFromUI.updateRecipeFromUI(command);
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
      this.gitHexa,
      deploymentPort,
    );
    this._updateRecipesFromGitLab = new UpdateRecipesFromGitLabUsecase(
      this.recipesServices.getRecipeService(),
      this.gitHexa,
      deploymentPort,
    );

    // Re-inject RecipesHexa if it was previously set
    if (this._recipesHexa) {
      this._updateRecipesFromGitHub.setRecipesHexa(this._recipesHexa);
      this._updateRecipesFromGitLab.setRecipesHexa(this._recipesHexa);
    }
  }

  /**
   * Set RecipesHexa reference for webhook use cases to enable delayed job access
   */
  setRecipesHexa(recipesHexa: RecipesHexa): void {
    this._recipesHexa = recipesHexa;
    this._updateRecipesFromGitHub.setRecipesHexa(recipesHexa);
    this._updateRecipesFromGitLab.setRecipesHexa(recipesHexa);
  }
}
