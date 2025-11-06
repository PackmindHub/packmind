import { DataSource } from 'typeorm';
import { AccountsRepository } from './infra/repositories/AccountsRepository';
import { AccountsAdapter } from './application/adapter/AccountsAdapter';
import { PackmindLogger } from '@packmind/logger';
import {
  ISpacesPort,
  IGitPort,
  IStandardsPort,
  IDeploymentPort,
} from '@packmind/shared/types';
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

  public readonly useCases: AccountsAdapter;

  private gitPort?: IGitPort;
  private standardsPort?: IStandardsPort;
  private deploymentPort?: IDeploymentPort;

  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
    private readonly apiKeyService?: ApiKeyService,
    private readonly spacesPort?: ISpacesPort,
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

      this.useCases = new AccountsAdapter(
        this.accountsServices,
        this.logger,
        this.spacesPort,
        undefined, // gitPort - will be set later via setter
        undefined, // standardsPort - will be set later via setter
        undefined, // deploymentPort - will be set later via setter
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

  /**
   * Set the Git port and reinitialize use cases that depend on it.
   */
  setGitPort(gitPort: IGitPort): void {
    this.gitPort = gitPort;
    this.useCases.setGitPort(gitPort);
    this.logger.debug('Git port updated');
  }

  /**
   * Set the Standards port and reinitialize use cases that depend on it.
   */
  setStandardsPort(standardsPort: IStandardsPort): void {
    this.standardsPort = standardsPort;
    this.useCases.setStandardsPort(standardsPort);
    this.logger.debug('Standards port updated');
  }

  /**
   * Set the Deployment port and reinitialize use cases that depend on it.
   */
  setDeploymentPort(deploymentPort: IDeploymentPort): void {
    this.deploymentPort = deploymentPort;
    this.useCases.setDeploymentPort(deploymentPort);
    this.logger.debug('Deployment port updated');
  }
}
