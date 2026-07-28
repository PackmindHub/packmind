import { PackmindLogger } from '@packmind/logger';
import {
  IBaseAdapter,
  JobsService,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  CaptureCommandCommand,
  CaptureCommandWithPackagesCommand,
  CaptureCommandWithPackagesResponse,
  DeleteCommandCommand,
  DeleteCommandsBatchCommand,
  GetCommandByIdCommand,
  IAccountsPort,
  IAccountsPortName,
  IDeploymentPort,
  IDeploymentPortName,
  IGitPort,
  IGitPortName,
  ILlmPort,
  ILlmPortName,
  ICommandsPort,
  ISpacesPort,
  ISpacesPortName,
  ListCommandsBySpaceCommand,
  OrganizationId,
  QueryOption,
  Command,
  CommandId,
  CommandVersionId,
  SpaceId,
  UpdateCommandFromUICommand,
  UpdateCommandFromUIResponse,
  UserId,
} from '@packmind/types';
import { ICommandsDelayedJobs } from '../jobs/ICommandsDelayedJobs';
import { DeployCommandsJobFactory } from '../../infra/jobs/DeployCommandsJobFactory';
import { CommandsServices } from '../services/CommandsServices';
import { CaptureCommandUseCase } from '../useCases/captureCommand/CaptureCommandUseCase';
import { CaptureCommandWithPackagesUseCase } from '../useCases/captureCommandWithPackages/CaptureCommandWithPackagesUseCase';
import { DeleteCommandUseCase } from '../useCases/deleteCommand/DeleteCommandUseCase';
import { DeleteCommandsBatchUseCase } from '../useCases/deleteCommandsBatch/DeleteCommandsBatchUseCase';
import { FindCommandBySlugUseCase } from '../useCases/findCommandBySlug/FindCommandBySlugUseCase';
import { GetCommandByIdUseCase } from '../useCases/getCommandById/GetCommandByIdUseCase';
import { GetCommandVersionUseCase } from '../useCases/getCommandVersion/GetCommandVersionUseCase';
import { ListCommandsBySpaceUseCase } from '../useCases/listCommandsBySpace/ListCommandsBySpaceUseCase';
import { ListCommandVersionsUseCase } from '../useCases/listCommandVersions/ListCommandVersionsUseCase';
import { UpdateCommandFromUIUseCase } from '../useCases/updateCommandFromUI/UpdateCommandFromUIUseCase';

const origin = 'RecipesAdapter';

export class CommandsAdapter
  implements IBaseAdapter<ICommandsPort>, ICommandsPort
{
  // Required ports - all set via initialize()
  private gitPort: IGitPort | null = null;
  private deploymentPort: IDeploymentPort | null = null;
  private accountsPort: IAccountsPort | null = null;
  private spacesPort: ISpacesPort | null = null;

  // Delayed jobs - built internally from JobsService
  private commandsDelayedJobs: ICommandsDelayedJobs | null = null;

  // Use cases - created in initialize()
  private _captureCommand!: CaptureCommandUseCase;
  private _captureCommandWithPackages!: CaptureCommandWithPackagesUseCase;
  private _updateCommandFromUI!: UpdateCommandFromUIUseCase;
  private _deleteCommand!: DeleteCommandUseCase;
  private _getCommandById!: GetCommandByIdUseCase;
  private _findCommandBySlug!: FindCommandBySlugUseCase;
  private _listCommandsBySpace!: ListCommandsBySpaceUseCase;
  private _listCommandVersions!: ListCommandVersionsUseCase;
  private _getCommandVersion!: GetCommandVersionUseCase;
  private _deleteCommandsBatch!: DeleteCommandsBatchUseCase;

  constructor(
    private readonly commandsServices: CommandsServices,
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
    this.commandsDelayedJobs = await this.buildDelayedJobs(
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
    this._captureCommand = new CaptureCommandUseCase(
      this.spacesPort,
      this.accountsPort,
      this.commandsServices.getCommandService(),
      this.commandsServices.getCommandVersionService(),
      ports.eventEmitterService,
    );

    this._captureCommandWithPackages = new CaptureCommandWithPackagesUseCase(
      this.accountsPort,
      this._captureCommand,
      this.deploymentPort,
      this.spacesPort,
    );

    this._updateCommandFromUI = new UpdateCommandFromUIUseCase(
      this.spacesPort,
      this.accountsPort,
      this.commandsServices.getCommandService(),
      this.commandsServices.getCommandVersionService(),
      ports.eventEmitterService,
    );

    this._deleteCommand = new DeleteCommandUseCase(
      this.spacesPort,
      this.accountsPort,
      this.commandsServices.getCommandService(),
      this.commandsServices.getCommandVersionService(),
      ports.eventEmitterService,
    );

    this._getCommandById = new GetCommandByIdUseCase(
      this.spacesPort,
      this.accountsPort,
      this.commandsServices.getCommandService(),
    );

    this._findCommandBySlug = new FindCommandBySlugUseCase(
      this.commandsServices.getCommandService(),
    );

    this._listCommandsBySpace = new ListCommandsBySpaceUseCase(
      this.spacesPort,
      this.accountsPort,
      this.commandsServices.getCommandService(),
    );

    this._listCommandVersions = new ListCommandVersionsUseCase(
      this.commandsServices.getCommandVersionService(),
    );

    this._getCommandVersion = new GetCommandVersionUseCase(
      this.commandsServices.getCommandVersionService(),
    );

    this._deleteCommandsBatch = new DeleteCommandsBatchUseCase(
      this._deleteCommand,
    );

    this.logger.info('RecipesAdapter initialized successfully');
  }

  /**
   * Build and register all recipes delayed jobs
   */
  private async buildDelayedJobs(
    jobsService: JobsService,
    deploymentPort: IDeploymentPort,
  ): Promise<ICommandsDelayedJobs> {
    this.logger.info('Building recipes delayed jobs');

    // Create DeployRecipes job factory
    const deployCommandsJobFactory = new DeployCommandsJobFactory(
      deploymentPort,
    );
    await deployCommandsJobFactory.createQueue();

    this.logger.debug('Registering DeployRecipes job queue');
    jobsService.registerJobQueue(
      deployCommandsJobFactory.getQueueName(),
      deployCommandsJobFactory,
    );

    this.logger.info('Recipes delayed jobs built and registered successfully');

    return {
      deployRecipesDelayedJob: deployCommandsJobFactory.getDelayedJob(),
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
      this.commandsDelayedJobs != null
    );
  }

  /**
   * Get the port interface this adapter implements.
   */
  public getPort(): ICommandsPort {
    return this as ICommandsPort;
  }

  /**
   * Get the delayed jobs for testing purposes.
   * @internal This method is intended for testing only
   */
  public getCommandsDelayedJobs(): ICommandsDelayedJobs {
    if (!this.commandsDelayedJobs) {
      throw new Error(
        'RecipesDelayedJobs not initialized. Call initialize() first.',
      );
    }
    return this.commandsDelayedJobs;
  }

  public captureCommand(command: CaptureCommandCommand) {
    return this._captureCommand.execute(command);
  }

  public async captureCommandWithPackages(
    command: CaptureCommandWithPackagesCommand,
  ): Promise<CaptureCommandWithPackagesResponse> {
    return this._captureCommandWithPackages.execute(command);
  }

  public async updateCommandFromUI(
    command: UpdateCommandFromUICommand,
  ): Promise<UpdateCommandFromUIResponse> {
    return this._updateCommandFromUI.execute(command);
  }

  public deleteCommand(command: DeleteCommandCommand) {
    return this._deleteCommand.execute(command);
  }

  /**
   * Get recipe by ID with access control (public API)
   */
  public async getCommandById(
    command: GetCommandByIdCommand,
  ): Promise<Command | null> {
    const result = await this._getCommandById.execute(command);
    return result.recipe;
  }

  /**
   * Get recipe by ID without access control (internal use only)
   * Used by UpdateRecipeFromUI
   */
  public getCommandByIdInternal(id: CommandId) {
    return this._getCommandById.getCommandById(id);
  }

  /**
   * Get commands by IDs without access control (internal use only).
   * Batch sibling of getCommandByIdInternal for cross-domain hydration.
   */
  public getCommandsByIdsInternal(ids: CommandId[]): Promise<Command[]> {
    return this._getCommandById.getCommandsByIds(ids);
  }

  public findCommandBySlug(
    slug: string,
    organizationId: OrganizationId,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ) {
    return this._findCommandBySlug.findCommandBySlug(
      slug,
      organizationId,
      opts,
    );
  }

  /**
   * List recipes by space with access control (public API)
   */
  public async listCommandsBySpace(
    command: ListCommandsBySpaceCommand,
  ): Promise<Command[]> {
    const result = await this._listCommandsBySpace.execute(command);
    return result.recipes;
  }

  public listCommandVersions(recipeId: CommandId) {
    return this._listCommandVersions.listCommandVersions(recipeId);
  }

  public getCommandVersion(
    recipeId: CommandId,
    version: number,
    allowedSpaceIds: SpaceId[],
  ) {
    return this._getCommandVersion.getCommandVersion(
      recipeId,
      version,
      allowedSpaceIds,
    );
  }

  public deleteCommandsBatch(command: DeleteCommandsBatchCommand) {
    return this._deleteCommandsBatch.execute(command);
  }

  public async getCommandVersionById(id: string) {
    const commandVersionService =
      this.commandsServices.getCommandVersionService();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return commandVersionService.getCommandVersionById(id as any);
  }

  async duplicateCommandToSpace(
    recipeId: CommandId,
    destinationSpaceId: SpaceId,
    newUserId: UserId,
  ): Promise<Command> {
    return this.commandsServices
      .getCommandService()
      .duplicateCommandToSpace(recipeId, destinationSpaceId, newUserId);
  }

  async markCommandAsMoved(
    recipeId: CommandId,
    destinationSpaceId: SpaceId,
  ): Promise<void> {
    return this.commandsServices
      .getCommandService()
      .markCommandAsMoved(recipeId, destinationSpaceId);
  }

  async hardDeleteCommand(recipeId: CommandId): Promise<void> {
    this.logger.info('Hard deleting recipe', { recipeId });
    await this.commandsServices.getCommandService().hardDeleteCommand(recipeId);
  }

  async hardDeleteCommandVersion(versionId: CommandVersionId): Promise<void> {
    this.logger.info('Hard deleting recipe version', { versionId });
    await this.commandsServices
      .getCommandService()
      .hardDeleteCommandVersion(versionId);
  }
}
