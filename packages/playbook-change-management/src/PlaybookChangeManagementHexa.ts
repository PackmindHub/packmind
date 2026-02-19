import { DataSource } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, HexaRegistry, BaseHexaOpts } from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  IPlaybookChangeManagementPort,
  IPlaybookChangeManagementPortName,
  IRecipesPort,
  IRecipesPortName,
  ISkillsPort,
  ISkillsPortName,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPort,
  IStandardsPortName,
} from '@packmind/types';
import { PlaybookChangeManagementAdapter } from './application/adapters/PlaybookChangeManagementAdapter';
import { PlaybookChangeManagementRepositories } from './infra/repositories/PlaybookChangeManagementRepositories';
import { PlaybookChangeManagementServices } from './application/services/PlaybookChangeManagementServices';

const origin = 'PlaybookChangeManagementHexa';

/**
 * PlaybookChangeManagementHexa - Facade for the Playbook Change Management domain
 * following the Port/Adapter pattern.
 *
 * This class serves as the main entry point for playbook change management functionality.
 * It exposes the adapter for cross-domain access following DDD standards.
 *
 * Uses database repository with localDataSource for persistence.
 */
export class PlaybookChangeManagementHexa extends BaseHexa<
  BaseHexaOpts,
  IPlaybookChangeManagementPort
> {
  private readonly playbookChangeManagementRepositories: PlaybookChangeManagementRepositories;
  private readonly playbookChangeManagementServices: PlaybookChangeManagementServices;
  private readonly playbookChangeManagementAdapter: PlaybookChangeManagementAdapter;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);
    this.logger.info('Constructing PlaybookChangeManagementHexa');

    try {
      this.playbookChangeManagementRepositories =
        new PlaybookChangeManagementRepositories(this.dataSource);
      this.playbookChangeManagementServices =
        new PlaybookChangeManagementServices(
          this.playbookChangeManagementRepositories,
          this.dataSource,
        );
      this.playbookChangeManagementAdapter =
        new PlaybookChangeManagementAdapter(
          this.playbookChangeManagementServices,
        );

      this.logger.info('PlaybookChangeManagementHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct PlaybookChangeManagementHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async initialize(registry: HexaRegistry): Promise<void> {
    this.logger.info(
      'Initializing PlaybookChangeManagementHexa (adapter retrieval phase)',
    );

    try {
      const accountsPort =
        registry.getAdapter<IAccountsPort>(IAccountsPortName);
      const recipesPort = registry.getAdapter<IRecipesPort>(IRecipesPortName);
      const spacesPort = registry.getAdapter<ISpacesPort>(ISpacesPortName);
      const skillsPort = registry.getAdapter<ISkillsPort>(ISkillsPortName);
      const standardsPort =
        registry.getAdapter<IStandardsPort>(IStandardsPortName);

      await this.playbookChangeManagementAdapter.initialize({
        [IAccountsPortName]: accountsPort,
        [IRecipesPortName]: recipesPort,
        [ISpacesPortName]: spacesPort,
        [ISkillsPortName]: skillsPort,
        [IStandardsPortName]: standardsPort,
      });

      this.logger.info('PlaybookChangeManagementHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize PlaybookChangeManagementHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  destroy(): void {
    this.logger.info('Destroying PlaybookChangeManagementHexa');
    this.logger.info('PlaybookChangeManagementHexa destroyed');
  }

  public getAdapter(): IPlaybookChangeManagementPort {
    return this.playbookChangeManagementAdapter.getPort();
  }

  public getPortName(): string {
    return IPlaybookChangeManagementPortName;
  }
}
