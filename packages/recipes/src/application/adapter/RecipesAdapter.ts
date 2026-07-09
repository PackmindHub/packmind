import { PackmindLogger } from '@packmind/logger';
import {
  IBaseAdapter,
  JobsService,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  CaptureRecipeCommand,
  CaptureRecipeWithPackagesCommand,
  CaptureRecipeWithPackagesResponse,
  DeleteRecipeCommand,
  DeleteRecipesBatchCommand,
  GetRecipeByIdCommand,
  IAccountsPort,
  IAccountsPortName,
  IDeploymentPort,
  IDeploymentPortName,
  IGitPort,
  IGitPortName,
  ILlmPort,
  ILlmPortName,
  IRecipesPort,
  ISpacesPort,
  ISpacesPortName,
  ListRecipesBySpaceCommand,
  OrganizationId,
  QueryOption,
  Recipe,
  RecipeId,
  RecipeVersionId,
  SpaceId,
  UpdateRecipeFromUICommand,
  UpdateRecipeFromUIResponse,
  UserId,
} from '@packmind/types';
import { IRecipesDelayedJobs } from '../../domain/jobs/IRecipesDelayedJobs';
import { DeployRecipesJobFactory } from '../../infra/jobs/DeployRecipesJobFactory';
import { RecipesServices } from '../services/RecipesServices';
import { CaptureRecipeUseCase } from '../useCases/captureRecipe/CaptureRecipeUseCase';
import { CaptureRecipeWithPackagesUseCase } from '../useCases/captureRecipeWithPackages/CaptureRecipeWithPackagesUseCase';
import { DeleteRecipeUseCase } from '../useCases/deleteRecipe/DeleteRecipeUseCase';
import { DeleteRecipesBatchUseCase } from '../useCases/deleteRecipesBatch/DeleteRecipesBatchUseCase';
import { FindRecipeBySlugUseCase } from '../useCases/findRecipeBySlug/FindRecipeBySlugUseCase';
import { GetRecipeByIdUseCase } from '../useCases/getRecipeById/GetRecipeByIdUseCase';
import { GetRecipeVersionUseCase } from '../useCases/getRecipeVersion/GetRecipeVersionUseCase';
import { ListRecipesBySpaceUseCase } from '../useCases/listRecipesBySpace/ListRecipesBySpaceUseCase';
import { ListRecipeVersionsUseCase } from '../useCases/listRecipeVersions/ListRecipeVersionsUseCase';
import { UpdateRecipeFromUIUseCase } from '../useCases/updateRecipeFromUI/UpdateRecipeFromUIUseCase';

const origin = 'RecipesAdapter';

export class RecipesAdapter
  implements IBaseAdapter<IRecipesPort>, IRecipesPort
{
  // Required ports - all set via initialize()
  private gitPort: IGitPort | null = null;
  private deploymentPort: IDeploymentPort | null = null;
  private accountsPort: IAccountsPort | null = null;
  private spacesPort: ISpacesPort | null = null;

  // Delayed jobs - built internally from JobsService
  private recipesDelayedJobs: IRecipesDelayedJobs | null = null;

  // Use cases - created in initialize()
  private _captureRecipe!: CaptureRecipeUseCase;
  private _captureRecipeWithPackages!: CaptureRecipeWithPackagesUseCase;
  private _updateRecipeFromUI!: UpdateRecipeFromUIUseCase;
  private _deleteRecipe!: DeleteRecipeUseCase;
  private _getRecipeById!: GetRecipeByIdUseCase;
  private _findRecipeBySlug!: FindRecipeBySlugUseCase;
  private _listRecipesBySpace!: ListRecipesBySpaceUseCase;
  private _listRecipeVersions!: ListRecipeVersionsUseCase;
  private _getRecipeVersion!: GetRecipeVersionUseCase;
  private _deleteRecipesBatch!: DeleteRecipesBatchUseCase;

  constructor(
    private readonly recipesServices: RecipesServices,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('RecipesAdapter constructed - awaiting initialization');
  }

  /**
   * Initialize adapter with ports and JobsService from registry.
   * All ports and JobsService in signature are REQUIRED.
   * Can be called multiple times (e.g., when deploymentPort is updated due to circular dependency).
   */
  public async initialize(ports: {
    [IGitPortName]: IGitPort;
    [IDeploymentPortName]: IDeploymentPort;
    [IAccountsPortName]: IAccountsPort;
    [ISpacesPortName]: ISpacesPort;
    [ILlmPortName]: ILlmPort;
    jobsService: JobsService;
    eventEmitterService: PackmindEventEmitterService;
  }): Promise<void> {
    this.logger.info('Initializing RecipesAdapter with ports and JobsService');

    // Step 1: Set all ports
    this.gitPort = ports[IGitPortName];
    this.deploymentPort = ports[IDeploymentPortName];
    this.accountsPort = ports[IAccountsPortName];
    this.spacesPort = ports[ISpacesPortName];

    // Step 2: Build delayed jobs
    this.recipesDelayedJobs = await this.buildDelayedJobs(
      ports.jobsService,
      this.deploymentPort,
    );

    // Step 2: Validate all required ports/delayed jobs are set
    if (!this.isReady()) {
      throw new Error(
        'RecipesAdapter: Required ports/delayed jobs not provided.',
      );
    }

    // Step 4: Create all use cases with non-null ports/services
    this._captureRecipe = new CaptureRecipeUseCase(
      this.spacesPort,
      this.accountsPort,
      this.recipesServices.getRecipeService(),
      this.recipesServices.getRecipeVersionService(),
      ports.eventEmitterService,
    );

    this._captureRecipeWithPackages = new CaptureRecipeWithPackagesUseCase(
      this.accountsPort,
      this._captureRecipe,
      this.deploymentPort,
      this.spacesPort,
    );

    this._updateRecipeFromUI = new UpdateRecipeFromUIUseCase(
      this.spacesPort,
      this.accountsPort,
      this.recipesServices.getRecipeService(),
      this.recipesServices.getRecipeVersionService(),
      ports.eventEmitterService,
    );

    this._deleteRecipe = new DeleteRecipeUseCase(
      this.spacesPort,
      this.accountsPort,
      this.recipesServices.getRecipeService(),
      this.recipesServices.getRecipeVersionService(),
      ports.eventEmitterService,
    );

    this._getRecipeById = new GetRecipeByIdUseCase(
      this.spacesPort,
      this.accountsPort,
      this.recipesServices.getRecipeService(),
    );

    this._findRecipeBySlug = new FindRecipeBySlugUseCase(
      this.recipesServices.getRecipeService(),
    );

    this._listRecipesBySpace = new ListRecipesBySpaceUseCase(
      this.spacesPort,
      this.accountsPort,
      this.recipesServices.getRecipeService(),
    );

    this._listRecipeVersions = new ListRecipeVersionsUseCase(
      this.recipesServices.getRecipeVersionService(),
    );

    this._getRecipeVersion = new GetRecipeVersionUseCase(
      this.recipesServices.getRecipeVersionService(),
    );

    this._deleteRecipesBatch = new DeleteRecipesBatchUseCase(
      this._deleteRecipe,
    );

    this.logger.info('RecipesAdapter initialized successfully');
  }

  /**
   * Build and register all recipes delayed jobs
   */
  private async buildDelayedJobs(
    jobsService: JobsService,
    deploymentPort: IDeploymentPort,
  ): Promise<IRecipesDelayedJobs> {
    this.logger.info('Building recipes delayed jobs');

    // Create DeployRecipes job factory
    const deployRecipesJobFactory = new DeployRecipesJobFactory(deploymentPort);
    await deployRecipesJobFactory.createQueue();

    this.logger.debug('Registering DeployRecipes job queue');
    jobsService.registerJobQueue(
      deployRecipesJobFactory.getQueueName(),
      deployRecipesJobFactory,
    );

    this.logger.info('Recipes delayed jobs built and registered successfully');

    return {
      deployRecipesDelayedJob: deployRecipesJobFactory.getDelayedJob(),
    };
  }

  /**
   * Check if all required ports and delayed jobs are set.
   */
  public isReady(): boolean {
    return (
      this.gitPort != null &&
      this.deploymentPort != null &&
      this.accountsPort != null &&
      this.spacesPort != null &&
      this.recipesDelayedJobs != null
    );
  }

  /**
   * Get the port interface this adapter implements.
   */
  public getPort(): IRecipesPort {
    return this as IRecipesPort;
  }

  /**
   * Get the delayed jobs for testing purposes.
   * @internal This method is intended for testing only
   */
  public getRecipesDelayedJobs(): IRecipesDelayedJobs {
    if (!this.recipesDelayedJobs) {
      throw new Error(
        'RecipesDelayedJobs not initialized. Call initialize() first.',
      );
    }
    return this.recipesDelayedJobs;
  }

  public captureRecipe(command: CaptureRecipeCommand) {
    return this._captureRecipe.execute(command);
  }

  public async captureRecipeWithPackages(
    command: CaptureRecipeWithPackagesCommand,
  ): Promise<CaptureRecipeWithPackagesResponse> {
    return this._captureRecipeWithPackages.execute(command);
  }

  public async updateRecipeFromUI(
    command: UpdateRecipeFromUICommand,
  ): Promise<UpdateRecipeFromUIResponse> {
    return this._updateRecipeFromUI.execute(command);
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
   * Used by UpdateRecipeFromUI
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

  /**
   * List recipes by space with access control (public API)
   */
  public async listRecipesBySpace(
    command: ListRecipesBySpaceCommand,
  ): Promise<Recipe[]> {
    const result = await this._listRecipesBySpace.execute(command);
    return result.recipes;
  }

  public countBySpaceIds(spaceIds: SpaceId[]): Promise<Map<SpaceId, number>> {
    return this.recipesServices.getRecipeService().countBySpaceIds(spaceIds);
  }

  /**
   * List all recipes across every space of an organization, bypassing space
   * membership checks. Used for organization-scoped aggregations where the
   * caller is already authorized at the organization level.
   */
  public async listAllRecipesByOrganization(
    organizationId: OrganizationId,
  ): Promise<Recipe[]> {
    if (!this.spacesPort) {
      this.logger.warn('SpacesPort not available, returning empty results');
      return [];
    }

    const spaces =
      await this.spacesPort.listSpacesByOrganization(organizationId);
    const recipesPerSpace = await Promise.all(
      spaces.map((space) =>
        this.recipesServices.getRecipeService().listRecipesBySpace(space.id),
      ),
    );
    return recipesPerSpace.flat();
  }

  public listRecipeVersions(recipeId: RecipeId) {
    return this._listRecipeVersions.listRecipeVersions(recipeId);
  }

  public getRecipeVersion(
    recipeId: RecipeId,
    version: number,
    allowedSpaceIds: SpaceId[],
  ) {
    return this._getRecipeVersion.getRecipeVersion(
      recipeId,
      version,
      allowedSpaceIds,
    );
  }

  public deleteRecipesBatch(command: DeleteRecipesBatchCommand) {
    return this._deleteRecipesBatch.execute(command);
  }

  public async getRecipeVersionById(id: string) {
    const recipeVersionService = this.recipesServices.getRecipeVersionService();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return recipeVersionService.getRecipeVersionById(id as any);
  }

  async duplicateRecipeToSpace(
    recipeId: RecipeId,
    destinationSpaceId: SpaceId,
    newUserId: UserId,
  ): Promise<Recipe> {
    return this.recipesServices
      .getRecipeService()
      .duplicateRecipeToSpace(recipeId, destinationSpaceId, newUserId);
  }

  async markRecipeAsMoved(
    recipeId: RecipeId,
    destinationSpaceId: SpaceId,
  ): Promise<void> {
    return this.recipesServices
      .getRecipeService()
      .markRecipeAsMoved(recipeId, destinationSpaceId);
  }

  async hardDeleteRecipe(recipeId: RecipeId): Promise<void> {
    this.logger.info('Hard deleting recipe', { recipeId });
    await this.recipesServices.getRecipeService().hardDeleteRecipe(recipeId);
  }

  async hardDeleteRecipeVersion(versionId: RecipeVersionId): Promise<void> {
    this.logger.info('Hard deleting recipe version', { versionId });
    await this.recipesServices
      .getRecipeService()
      .hardDeleteRecipeVersion(versionId);
  }
}
