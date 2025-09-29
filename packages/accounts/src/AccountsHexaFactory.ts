import { DataSource } from 'typeorm';
import { AccountsRepository } from './infra/repositories/AccountsRepository';
import { AccountsUseCases } from './application/useCases';
import { PackmindLogger } from '@packmind/shared';
import { ApiKeyService } from './application/services/ApiKeyService';
import { EnhancedAccountsServices } from './application/services/EnhancedAccountsServices';

const origin = 'AccountsHexa';

/**
 * AccountsHexaFactory - Central hexagon for the Accounts domain
 *
 * Serves as the domain boundary following hexagonal architecture patterns.
 * This class is a pure facade that handles dependency injection and
 * exposes use cases as ports for external adapters.
 *
 * Business logic lives in the use cases, not here.
 */
export class AccountsHexaFactory {
  private readonly accountsRepository: AccountsRepository;
  private readonly accountsServices: EnhancedAccountsServices;

  public readonly useCases: AccountsUseCases;

  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
    private readonly apiKeyService?: ApiKeyService,
  ) {
    this.logger.info('Initializing AccountsHexa');

    try {
      this.logger.debug(
        'Creating repository and service aggregators with DataSource',
      );

      this.accountsRepository = new AccountsRepository(this.dataSource);
      this.accountsServices = new EnhancedAccountsServices(
        this.accountsRepository,
        this.logger,
        this.apiKeyService,
      );

      this.useCases = new AccountsUseCases(
        this.accountsServices,
        this.dataSource,
        this.logger,
      );
      this.logger.debug(
        'Repository aggregator, service aggregator, and use cases created successfully',
      );

      this.logger.info('AccountsHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize AccountsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
