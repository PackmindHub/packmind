import { DataSource } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { UserProvider, OrganizationProvider } from '@packmind/types';
import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import { ISpacesPort, IAccountsPort, IAccountsPortName } from '@packmind/types';
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

  constructor(dataSource: DataSource, opts?: Partial<AccountsHexaOpts>) {
    super(dataSource, { ...baseAccountsHexaOpts, ...opts });
    this.logger.info('Constructing AccountsHexa');

    try {
      // Initialize the hexagon factory with the DataSource
      // Adapter retrieval will be done in initialize(registry)
      this.hexa = new AccountsHexaFactory(
        this.dataSource,
        this.logger,
        opts?.apiKeyService,
        opts?.spacesPort, // Use provided spacesPort if available
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
      if (!this.opts?.spacesPort) {
        try {
          const spacesHexa = registry.get(SpacesHexa);
          const spacesPort = spacesHexa.getAdapter();
          this.hexa.useCases.setSpacesPort(spacesPort);
          this.logger.debug('Retrieved SpacesAdapter from SpacesHexa');
        } catch (error) {
          this.logger.debug('SpacesHexa not available in registry', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
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
   * Get the port name for this hexa.
   */
  public getPortName(): string {
    return IAccountsPortName;
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
}
