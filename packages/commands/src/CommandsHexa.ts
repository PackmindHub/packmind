import { PackmindLogger } from '@packmind/logger';
import {
  BaseHexa,
  BaseHexaOpts,
  HexaRegistry,
  JobsService,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  IDeploymentPort,
  IDeploymentPortName,
  IGitPort,
  IGitPortName,
  ILlmPort,
  ILlmPortName,
  ICommandsPort,
  ICommandsPortName,
  ISpacesPort,
  ISpacesPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { CommandsAdapter } from './application/adapter/CommandsAdapter';
import { CommandsServices } from './application/services/CommandsServices';
import { CommandsRepositories } from './infra/repositories/CommandsRepositories';

const origin = 'RecipesHexa';

export class CommandsHexa extends BaseHexa<BaseHexaOpts, ICommandsPort> {
  private readonly commandsRepositories: CommandsRepositories;
  private readonly commandsServices: CommandsServices;
  private readonly adapter: CommandsAdapter;
  private isInitialized = false;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);

    this.logger.info('Constructing RecipesHexa');

    try {
      this.logger.debug(
        'Creating repository and service aggregators with DataSource',
      );

      this.commandsRepositories = new CommandsRepositories(dataSource);
      this.commandsServices = new CommandsServices(this.commandsRepositories);

      // Create adapter in constructor - dependencies will be injected in initialize()
      this.logger.debug('Creating RecipesAdapter');
      this.adapter = new CommandsAdapter(this.commandsServices);

      this.logger.info('RecipesHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct RecipesHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async initialize(registry: HexaRegistry): Promise<void> {
    if (this.isInitialized) {
      this.logger.debug('RecipesHexa already initialized');
      return;
    }

    this.logger.info('Initializing RecipesHexa (adapter retrieval phase)');

    try {
      const gitPort = registry.getAdapter<IGitPort>(IGitPortName);
      const accountsPort =
        registry.getAdapter<IAccountsPort>(IAccountsPortName);
      const spacesPort = registry.getAdapter<ISpacesPort>(ISpacesPortName);
      const llmPort = registry.getAdapter<ILlmPort>(ILlmPortName);

      // Get deployment port - DeploymentsHexa builds its adapter in its
      // constructor, so this reference is live even though that hexa is
      // initialized after this one.
      const deploymentPort =
        registry.getAdapter<IDeploymentPort>(IDeploymentPortName);

      const jobsService = registry.getService(JobsService);

      const eventEmitterService = registry.getService(
        PackmindEventEmitterService,
      );

      await this.adapter.initialize({
        [IGitPortName]: gitPort,
        [IDeploymentPortName]: deploymentPort,
        [IAccountsPortName]: accountsPort,
        [ISpacesPortName]: spacesPort,
        [ILlmPortName]: llmPort,
        jobsService,
        eventEmitterService,
      });

      this.isInitialized = true;
      this.logger.info('RecipesHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize RecipesHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public destroy(): void {
    this.logger.info('Destroying RecipesHexa');
    this.logger.info('RecipesHexa destroyed');
  }

  public getAdapter(): ICommandsPort {
    return this.adapter.getPort();
  }

  public getPortName(): string {
    return ICommandsPortName;
  }
}
