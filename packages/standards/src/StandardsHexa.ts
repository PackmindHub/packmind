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
  ILinterPort,
  ILinterPortName,
  ILlmPort,
  ILlmPortName,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { StandardsHexaDependencyMissingError } from './domain/errors';
import { StandardsServices } from './application/services/StandardsServices';
import { StandardsAdapter } from './application/adapter/StandardsAdapter';
import { StandardsRepositories } from './infra/repositories/StandardsRepositories';

const origin = 'StandardsHexa';

export class StandardsHexa extends BaseHexa<BaseHexaOpts, StandardsAdapter> {
  public readonly standardsRepositories: StandardsRepositories;
  public readonly standardsServices: StandardsServices;
  private readonly adapter: StandardsAdapter;
  public isInitialized = false;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);
    this.logger.info('Constructing StandardsHexa');

    try {
      this.logger.debug(
        'Creating repository and service aggregators with DataSource',
      );

      this.standardsRepositories = new StandardsRepositories(this.dataSource);

      // Linter adapter is set later, in initialize()
      this.standardsServices = new StandardsServices(
        this.standardsRepositories,
      );

      // Ports are injected later, in initialize()
      this.logger.debug('Creating StandardsAdapter');
      this.adapter = new StandardsAdapter(
        this.standardsServices,
        this.standardsRepositories,
      );

      this.logger.info('StandardsHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct StandardsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async initialize(registry: HexaRegistry): Promise<void> {
    if (this.isInitialized) {
      this.logger.debug('StandardsHexa already initialized');
      return;
    }

    this.logger.info('Initializing StandardsHexa (adapter retrieval phase)');

    try {
      const accountsPort =
        registry.getAdapter<IAccountsPort>(IAccountsPortName);
      const spacesPort = registry.getAdapter<ISpacesPort>(ISpacesPortName);
      const linterPort = registry.getAdapter<ILinterPort>(ILinterPortName);
      const deploymentsPort =
        registry.getAdapter<IDeploymentPort>(IDeploymentPortName);
      const llmPort = registry.getAdapter<ILlmPort>(ILlmPortName);

      this.logger.info('All required ports retrieved from registry');

      const jobsService = registry.getService(JobsService);
      if (!jobsService) {
        throw new StandardsHexaDependencyMissingError('JobsService');
      }

      const eventEmitterService = registry.getService(
        PackmindEventEmitterService,
      );

      this.standardsServices.setLinterAdapter(linterPort);

      await this.adapter.initialize({
        [IAccountsPortName]: accountsPort,
        [ISpacesPortName]: spacesPort,
        [ILinterPortName]: linterPort,
        [IDeploymentPortName]: deploymentsPort,
        [ILlmPortName]: llmPort,
        jobsService,
        eventEmitterService,
      });

      this.isInitialized = true;
      this.logger.info('StandardsHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize StandardsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public getAdapter(): StandardsAdapter {
    return this.adapter.getPort() as StandardsAdapter;
  }

  public getPortName(): string {
    return IStandardsPortName;
  }

  public destroy(): void {
    this.logger.info('Destroying StandardsHexa');
    this.logger.info('StandardsHexa destroyed');
  }
}
