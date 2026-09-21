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
  IDeploymentPort,
  IDeploymentPortName,
  IGitPort,
  IGitPortName,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPort,
  IStandardsPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { AccountsAdapter } from './application/adapter/AccountsAdapter';
import { ApiKeyService } from './application/services/ApiKeyService';
import { EnhancedAccountsServices } from './application/services/EnhancedAccountsServices';
import { AccountsRepositories } from './infra/repositories/AccountsRepositories';

const origin = 'AccountsHexa';

export type AccountsHexaOpts = BaseHexaOpts & {
  apiKeyService?: ApiKeyService;
};

const baseAccountsHexaOpts = { logger: new PackmindLogger(origin) };

export class AccountsHexa extends BaseHexa<AccountsHexaOpts, IAccountsPort> {
  private readonly accountsRepositories: AccountsRepositories;
  private readonly accountsServices: EnhancedAccountsServices;
  private readonly adapter: AccountsAdapter;

  constructor(dataSource: DataSource, opts?: Partial<AccountsHexaOpts>) {
    super(dataSource, { ...baseAccountsHexaOpts, ...opts });
    this.logger.info('Constructing AccountsHexa');

    try {
      this.logger.debug(
        'Creating repository and service aggregators with DataSource',
      );

      this.accountsRepositories = new AccountsRepositories(this.dataSource);
      this.accountsServices = new EnhancedAccountsServices(
        this.accountsRepositories,
        opts?.apiKeyService,
      );

      this.adapter = new AccountsAdapter(this.accountsServices);
      this.logger.debug(
        'Repository aggregator, service aggregator, and adapter created successfully',
      );

      this.logger.info('AccountsHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct AccountsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async initialize(registry: HexaRegistry): Promise<void> {
    this.logger.info('Initializing AccountsHexa (adapter retrieval phase)');

    try {
      const eventEmitterService = registry.getService(
        PackmindEventEmitterService,
      );

      await this.adapter.initialize({
        [ISpacesPortName]: registry.getAdapter<ISpacesPort>(ISpacesPortName),
        [IGitPortName]: registry.getAdapter<IGitPort>(IGitPortName),
        [IStandardsPortName]:
          registry.getAdapter<IStandardsPort>(IStandardsPortName),
        [IDeploymentPortName]:
          registry.getAdapter<IDeploymentPort>(IDeploymentPortName),
        eventEmitterService,
      });

      this.logger.info('AccountsHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize AccountsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  destroy(): void {
    this.logger.info('Destroying AccountsHexa');
    this.logger.info('AccountsHexa destroyed');
  }

  // Usable right after construction; initialize() only wires its ports.
  public getAdapter(): IAccountsPort {
    return this.adapter;
  }

  public getPortName(): string {
    return IAccountsPortName;
  }
}
