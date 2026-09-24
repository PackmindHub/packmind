import { PackmindLogger } from '@packmind/logger';
import {
  BaseHexa,
  BaseHexaOpts,
  HexaRegistry,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  ISkillsPortName,
  ISpacesPort,
  ISpacesPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { SkillsHexaDependencyMissingError } from './domain/errors';
import { SkillsAdapter } from './application/adapter/SkillsAdapter';
import { SkillsServices } from './application/services/SkillsServices';
import { SkillsRepositories } from './infra/repositories/SkillsRepositories';

const origin = 'SkillsHexa';

export class SkillsHexa extends BaseHexa<BaseHexaOpts, SkillsAdapter> {
  public readonly skillsRepositories: SkillsRepositories;
  public readonly skillsServices: SkillsServices;
  private readonly adapter: SkillsAdapter;
  public isInitialized = false;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);
    this.logger.info('Constructing SkillsHexa');

    try {
      this.logger.debug(
        'Creating repository and service aggregators with DataSource',
      );

      this.skillsRepositories = new SkillsRepositories(this.dataSource);
      this.skillsServices = new SkillsServices(this.skillsRepositories);

      // Adapter is created here; cross-domain ports are injected later in initialize()
      this.logger.debug('Creating SkillsAdapter');
      this.adapter = new SkillsAdapter(
        this.skillsServices,
        this.skillsRepositories,
      );

      this.logger.info('SkillsHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct SkillsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async initialize(registry: HexaRegistry): Promise<void> {
    if (this.isInitialized) {
      this.logger.debug('SkillsHexa already initialized');
      return;
    }

    this.logger.info('Initializing SkillsHexa (adapter retrieval phase)');

    try {
      // Ports are required; let a missing one throw here rather than fail later
      const accountsPort =
        registry.getAdapter<IAccountsPort>(IAccountsPortName);
      const spacesPort = registry.getAdapter<ISpacesPort>(ISpacesPortName);

      this.logger.info('All required ports retrieved from registry');

      const eventEmitterService = registry.getService(
        PackmindEventEmitterService,
      );

      if (!eventEmitterService) {
        throw new SkillsHexaDependencyMissingError(
          'PackmindEventEmitterService',
        );
      }

      await this.adapter.initialize({
        [IAccountsPortName]: accountsPort,
        [ISpacesPortName]: spacesPort,
        eventEmitterService,
      });

      this.isInitialized = true;
      this.logger.info('SkillsHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize SkillsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // Implements ISkillsPort; available as soon as the hexa is constructed,
  // ahead of initialize(), since other domains resolve it via the registry.
  public getAdapter(): SkillsAdapter {
    return this.adapter.getPort() as SkillsAdapter;
  }

  public getPortName(): string {
    return ISkillsPortName;
  }

  public destroy(): void {
    this.logger.info('Destroying SkillsHexa');
    this.logger.info('SkillsHexa destroyed');
  }
}
