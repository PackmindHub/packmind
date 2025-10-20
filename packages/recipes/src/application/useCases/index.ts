import { CaptureRecipeUsecase } from './captureRecipe/captureRecipe.usecase';
import { UpdateRecipesFromGitHubUsecase } from './updateRecipesFromGitHub/updateRecipesFromGitHub.usecase';
import { UpdateRecipesFromGitLabUsecase } from './updateRecipesFromGitLab/updateRecipesFromGitLab.usecase';
import { UpdateRecipeFromUIUsecase } from './updateRecipeFromUI/updateRecipeFromUI.usecase';
import { DeleteRecipeUsecase } from './deleteRecipe/deleteRecipe.usecase';
import { GetRecipeByIdUsecase } from './getRecipeById/getRecipeById.usecase';
import { FindRecipeBySlugUsecase } from './findRecipeBySlug/findRecipeBySlug.usecase';
import { ListRecipesByOrganizationUsecase } from './listRecipesByOrganization/listRecipesByOrganization.usecase';
import { ListRecipeVersionsUsecase } from './listRecipeVersions/listRecipeVersions.usecase';
import { GetRecipeVersionUsecase } from './getRecipeVersion/getRecipeVersion.usecase';
import { DeleteRecipesBatchUsecase } from './deleteRecipesBatch/deleteRecipesBatch.usecase';
import { IRecipesServices } from '../IRecipesServices';
import {
  CaptureRecipeCommand,
  UpdateRecipesFromGitHubCommand,
  UpdateRecipesFromGitLabCommand,
  PackmindLogger,
  QueryOption,
  IDeploymentPort,
} from '@packmind/shared';
import { GitHexa } from '@packmind/git';
import { OrganizationId, UserId } from '@packmind/accounts';
import { RecipeId } from '@packmind/shared';
import { RecipesHexa } from '../../RecipesHexa';

import {
  DeleteRecipeCommand,
  DeleteRecipesBatchCommand,
} from '../../domain/useCases/IDeleteRecipeUseCase';

const origin = 'RecipeUseCases';

export class RecipeUseCases {
  private readonly _captureRecipe: CaptureRecipeUsecase;
  private _updateRecipesFromGitHub: UpdateRecipesFromGitHubUsecase;
  private _updateRecipesFromGitLab: UpdateRecipesFromGitLabUsecase;
  private readonly _updateRecipeFromUI: UpdateRecipeFromUIUsecase;
  private readonly _deleteRecipe: DeleteRecipeUsecase;
  private readonly _getRecipeById: GetRecipeByIdUsecase;
  private readonly _findRecipeBySlug: FindRecipeBySlugUsecase;
  private readonly _listRecipesByOrganization: ListRecipesByOrganizationUsecase;
  private readonly _listRecipeVersions: ListRecipeVersionsUsecase;
  private readonly _getRecipeVersion: GetRecipeVersionUsecase;
  private readonly _deleteRecipesBatch: DeleteRecipesBatchUsecase;
  private _recipesHexa: RecipesHexa | null = null;

  constructor(
    private readonly recipesServices: IRecipesServices,
    private readonly gitHexa: GitHexa,
    private readonly deploymentPort?: IDeploymentPort,
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
      recipesServices.getRecipeService(),
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

    this.logger.info('RecipeUseCases initialized successfully');
  }

  public captureRecipe(command: CaptureRecipeCommand) {
    return this._captureRecipe.execute(command);
  }

  public updateRecipeFromUI(param: {
    recipeId: RecipeId;
    name: string;
    content: string;
    editorUserId: UserId;
  }) {
    return this._updateRecipeFromUI.updateRecipeFromUI(param);
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

  public getRecipeById(id: RecipeId) {
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

  public listRecipeVersions(recipeId: RecipeId) {
    return this._listRecipeVersions.listRecipeVersions(recipeId);
  }

  public getRecipeVersion(recipeId: RecipeId, version: number) {
    return this._getRecipeVersion.getRecipeVersion(recipeId, version);
  }

  public deleteRecipesBatch(command: DeleteRecipesBatchCommand) {
    return this._deleteRecipesBatch.execute(command);
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
