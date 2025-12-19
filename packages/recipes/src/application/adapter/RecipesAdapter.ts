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
  UpdateRecipeFromUICommand,
  UpdateRecipeFromUIResponse,
  UpdateRecipesFromGitHubCommand,
  UpdateRecipesFromGitLabCommand,
} from '@packmind/types';
import { IRecipesDelayedJobs } from '../../domain/jobs/IRecipesDelayedJobs';
import { DeployRecipesJobFactory } from '../../infra/jobs/DeployRecipesJobFactory';
import { UpdateRecipesAndGenerateSummariesJobFactory } from '../../infra/jobs/UpdateRecipesAndGenerateSummariesJobFactory';
import { RecipesServices } from '../services/RecipesServices';
import { CaptureRecipeUsecase } from '../useCases/captureRecipe/captureRecipe.usecase';
import { CaptureRecipeWithPackagesUsecase } from '../useCases/captureRecipeWithPackages/captureRecipeWithPackages.usecase';
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

export class RecipesAdapter
  implements IBaseAdapter<IRecipesPort>, IRecipesPort
{
  // Required ports - all set via initialize()
  private gitPort: IGitPort | null = null;
  private deploymentPort: IDeploymentPort | null = null;
  private accountsPort: IAccountsPort | null = null;
  private spacesPort: ISpacesPort | null = null;
  private llmPort: ILlmPort | null = null;

  // Delayed jobs - built internally from JobsService
  private recipesDelayedJobs: IRecipesDelayedJobs | null = null;

  // Use cases - created in initialize()
  private _captureRecipe!: CaptureRecipeUsecase;
  private _captureRecipeWithPackages!: CaptureRecipeWithPackagesUsecase;
  private _updateRecipesFromGitHub!: UpdateRecipesFromGitHubUsecase;
  private _updateRecipesFromGitLab!: UpdateRecipesFromGitLabUsecase;
  private _updateRecipeFromUI!: UpdateRecipeFromUIUsecase;
  private _deleteRecipe!: DeleteRecipeUsecase;
  private _getRecipeById!: GetRecipeByIdUsecase;
  private _findRecipeBySlug!: FindRecipeBySlugUsecase;
  private _listRecipesByOrganization!: ListRecipesByOrganizationUsecase;
  private _listRecipesBySpace!: ListRecipesBySpaceUsecase;
  private _listRecipeVersions!: ListRecipeVersionsUsecase;
  private _getRecipeVersion!: GetRecipeVersionUsecase;
  private _deleteRecipesBatch!: DeleteRecipesBatchUsecase;

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
    this.llmPort = ports[ILlmPortName];

    // Set llmPort to services
    if (this.llmPort) {
      this.recipesServices.setLlmPort(this.llmPort);
    }

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
    this._captureRecipe = new CaptureRecipeUsecase(
      this.recipesServices.getRecipeService(),
      this.recipesServices.getRecipeVersionService(),
      this.recipesServices.getRecipeSummaryService(),
      ports.eventEmitterService,
      this.logger,
    );

    this._captureRecipeWithPackages = new CaptureRecipeWithPackagesUsecase(
      this.accountsPort!,
      this._captureRecipe,
      this.deploymentPort!,
      this.spacesPort!,
      this.logger,
    );

    this._updateRecipesFromGitHub = new UpdateRecipesFromGitHubUsecase(
      this.recipesServices.getRecipeService(),
      this.gitPort!,
      this.deploymentPort!,
    );
    this._updateRecipesFromGitHub.setRecipesDelayedJobs(
      this.recipesDelayedJobs,
    );

    this._updateRecipesFromGitLab = new UpdateRecipesFromGitLabUsecase(
      this.recipesServices.getRecipeService(),
      this.gitPort!,
      this.deploymentPort!,
    );
    this._updateRecipesFromGitLab.setRecipesDelayedJobs(
      this.recipesDelayedJobs,
    );

    this._updateRecipeFromUI = new UpdateRecipeFromUIUsecase(
      this.recipesServices.getRecipeService(),
      this.recipesServices.getRecipeVersionService(),
      this.recipesServices.getRecipeSummaryService(),
      ports.eventEmitterService,
      this.logger,
    );

    this._deleteRecipe = new DeleteRecipeUsecase(
      this.recipesServices.getRecipeService(),
      this.recipesServices.getRecipeVersionService(),
      ports.eventEmitterService,
    );

    this._getRecipeById = new GetRecipeByIdUsecase(
      this.accountsPort!,
      this.recipesServices.getRecipeService(),
      this.spacesPort!,
      this.logger,
    );

    this._findRecipeBySlug = new FindRecipeBySlugUsecase(
      this.recipesServices.getRecipeService(),
      this.logger,
    );

    this._listRecipesByOrganization = new ListRecipesByOrganizationUsecase(
      this.recipesServices.getRecipeService(),
      this.logger,
    );

    this._listRecipesBySpace = new ListRecipesBySpaceUsecase(
      this.accountsPort!,
      this.recipesServices.getRecipeService(),
      this.spacesPort!,
      this.logger,
    );

    this._listRecipeVersions = new ListRecipeVersionsUsecase(
      this.recipesServices.getRecipeVersionService(),
      this.logger,
    );

    this._getRecipeVersion = new GetRecipeVersionUsecase(
      this.recipesServices.getRecipeVersionService(),
      this.logger,
    );

    this._deleteRecipesBatch = new DeleteRecipesBatchUsecase(
      this._deleteRecipe,
      this.logger,
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

    // Create UpdateRecipesAndGenerateSummaries job factory
    const updateRecipesJobFactory =
      new UpdateRecipesAndGenerateSummariesJobFactory(
        this.recipesServices.getRecipeService(),
        this.recipesServices.getRecipeVersionService(),
        this.recipesServices.getRecipeSummaryService(),
      );
    await updateRecipesJobFactory.createQueue();

    // Create DeployRecipes job factory
    const deployRecipesJobFactory = new DeployRecipesJobFactory(deploymentPort);
    await deployRecipesJobFactory.createQueue();

    // Register job factories with JobsService
    this.logger.debug(
      'Registering UpdateRecipesAndGenerateSummaries job queue',
    );
    jobsService.registerJobQueue(
      updateRecipesJobFactory.getQueueName(),
      updateRecipesJobFactory,
    );

    this.logger.debug('Registering DeployRecipes job queue');
    jobsService.registerJobQueue(
      deployRecipesJobFactory.getQueueName(),
      deployRecipesJobFactory,
    );

    this.logger.info('Recipes delayed jobs built and registered successfully');

    return {
      updateRecipesAndGenerateSummariesDelayedJob:
        updateRecipesJobFactory.getDelayedJob(),
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
}
