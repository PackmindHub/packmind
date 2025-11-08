import { PackmindLogger } from '@packmind/logger';
import { UserProvider, OrganizationProvider } from '@packmind/types';
import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import {
  ISpacesPort,
  IGitPort,
  IStandardsPort,
  IDeploymentPort,
  IAccountsPort,
} from '@packmind/types';
import { AccountsHexaFactory } from './AccountsHexaFactory';
import { ApiKeyService } from './application/services/ApiKeyService';
import { SpacesHexa } from '@packmind/spaces';

const origin = 'AccountsHexa';

/**
 * AccountsHexa - Facade for the Accounts domain following the new Hexa pattern.
 *
 * This class serves as the main entry point for accounts-related functionality.
 * It holds the AccountsHexa instance and exposes use cases as a clean facade.
 *
 * The Hexa pattern separates concerns:
 * - AccountsHexaFactory: Handles dependency injection and service instantiation
 * - AccountsHexa: Serves as use case facade and integration point with other domains
 *
 * Uses the DataSource provided through the HexaRegistry for database operations.
 */
export type AccountsHexaOpts = BaseHexaOpts & {
  apiKeyService?: ApiKeyService;
  spacesPort?: ISpacesPort;
};

const baseAccountsHexaOpts = { logger: new PackmindLogger(origin) };

export class AccountsHexa extends BaseHexa<AccountsHexaOpts, IAccountsPort> {
  private readonly hexa: AccountsHexaFactory;
  private userProvider?: UserProvider;
  private organizationProvider?: OrganizationProvider;

  constructor(registry: HexaRegistry, opts?: Partial<AccountsHexaOpts>) {
    super(registry, { ...baseAccountsHexaOpts, ...opts });
    this.logger.info('Initializing AccountsHexa');

    try {
      // Get the DataSource from the registry
      const dataSource = registry.getDataSource();
      this.logger.debug('Retrieved DataSource from registry');

      // Get SpacesHexa adapter for ISpacesPort (lazy DI per DDD standard)
      let spacesPort: ISpacesPort | undefined = opts?.spacesPort;
      if (!spacesPort) {
        try {
          const spacesHexa = registry.get(SpacesHexa);
          spacesPort = spacesHexa.getAdapter();
          this.logger.debug('Retrieved SpacesAdapter from SpacesHexa');
        } catch (error) {
          this.logger.debug('SpacesHexa not available in registry', {
            error: error instanceof Error ? error.message : String(error),
          });
          spacesPort = undefined;
        }
      }

      // Initialize the hexagon with the shared DataSource and optional dependencies
      this.hexa = new AccountsHexaFactory(
        dataSource,
        this.logger,
        opts?.apiKeyService,
        spacesPort,
      );
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
    // Add any cleanup logic here if needed
    this.logger.info('AccountsHexa destroyed');
  }

  /**
   * Get the Accounts adapter for cross-domain access to accounts data.
   * This adapter implements IAccountsPort and can be injected into other domains.
   * The adapter is available immediately after construction.
   */
  public getAdapter(): IAccountsPort {
    return this.hexa.useCases;
  }

  /**
   * Expose the user provider adapter for other hexagons
   */
  getUserProvider(): UserProvider {
    if (!this.userProvider) {
      this.userProvider = {
        getUserById: (userId) => this.hexa.useCases.getUserById({ userId }),
      };
    }

    return this.userProvider;
  }

  /**
   * Expose the organization provider adapter for other hexagons
   */
  getOrganizationProvider(): OrganizationProvider {
    if (!this.organizationProvider) {
      this.organizationProvider = {
        getOrganizationById: (organizationId) =>
          this.hexa.useCases.getOrganizationById({ organizationId }),
      };
    }

    return this.organizationProvider;
  }

  // ========================================
  // PORT SETTERS (for lazy dependency injection)
  // ========================================

  /**
   * Set the Git port for cross-domain access to git data.
   */
  setGitPort(gitPort: IGitPort): void {
    this.hexa.setGitPort(gitPort);
  }

  /**
   * Set the Standards port for cross-domain access to standards data.
   */
  setStandardsPort(standardsPort: IStandardsPort): void {
    this.hexa.setStandardsPort(standardsPort);
  }

  /**
   * Set the Deployment port for cross-domain access to deployment data.
   */
  setDeploymentPort(deploymentPort: IDeploymentPort): void {
    this.hexa.setDeploymentPort(deploymentPort);
  }
}
