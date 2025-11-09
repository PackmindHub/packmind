import { AccountsHexa } from '@packmind/accounts';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import { RecipesHexa } from '@packmind/recipes';
import { SpacesHexa } from '@packmind/spaces';
import { StandardsHexa } from '@packmind/standards';
import {
  IDeploymentPort,
  IDeploymentPortName,
  IGitPort,
  IGitPortName,
  IRecipesPort,
  ISpacesPort,
  IStandardsPort,
  OrganizationProvider,
  UserProvider,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { DeploymentsHexaFactory } from './DeploymentsHexaFactory';
import { RecipesAdapter } from './adapters/RecipesAdapter';
import { DeploymentsAdapter } from './application/adapter/DeploymentsAdapter';

const origin = 'DeploymentsHexa';

/**
 * DeploymentsHexa - Facade for the Deployments domain following the Hexa pattern.
 *
 * This class serves as the main entry point for deployment functionality.
 * It handles the deployment of recipes and standards to git repositories
 * and tracks deployment history.
 *
 * The Hexa pattern separates concerns:
 * - DeploymentsHexaFactory: Handles dependency injection and service instantiation
 * - DeploymentsHexa: Serves as use case facade and integration point with other domains
 */
export class DeploymentsHexa extends BaseHexa<BaseHexaOpts, IDeploymentPort> {
  private hexa: DeploymentsHexaFactory;
  private readonly deploymentsUsecases: IDeploymentPort;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);
    this.logger.info('Constructing DeploymentsHexa');

    try {
      // Create factory without gitPort (will be set during initialization)
      this.hexa = new DeploymentsHexaFactory(this.logger, this.dataSource);

      // Create adapter in constructor - ports will be set during initialize()
      this.deploymentsUsecases = new DeploymentsAdapter(this.hexa);

      this.logger.info('DeploymentsHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct DeploymentsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initialize the hexa with access to the registry for adapter retrieval.
   */
  public async initialize(registry: HexaRegistry): Promise<void> {
    this.logger.info('Initializing DeploymentsHexa (adapter retrieval phase)');

    try {
      // Using getAdapter to avoid circular dependency (GitHexa imports DeploymentsHexa)
      const gitPort = registry.getAdapter<IGitPort>(IGitPortName);

      // Update factory with gitPort (recreate services with real gitPort)
      this.hexa = new DeploymentsHexaFactory(
        this.logger,
        this.dataSource,
        gitPort,
      );

      // Set ports on adapter and update services reference
      const adapter = this.deploymentsUsecases as DeploymentsAdapter;
      adapter.setGitPort(gitPort);
      adapter.updateDeploymentsServices(this.hexa.services.deployments);

      // RecipesHexa might not be available during initialization due to circular dependency
      // Using adapter pattern to decouple from RecipesHexa
      let recipesPort: Partial<IRecipesPort> | undefined;
      try {
        const recipesHexa = registry.get(RecipesHexa);
        recipesPort = new RecipesAdapter(recipesHexa);
        adapter.updateRecipesPort(recipesPort);
      } catch {
        // RecipesHexa will be resolved later when fully initialized
        this.logger.debug('RecipesHexa not available in registry');
      }

      const codingAgentHexa = registry.get(CodingAgentHexa);
      const codingAgentPort = codingAgentHexa.getAdapter();
      adapter.setCodingAgentPort(codingAgentPort);
      adapter.setCodingAgentHexa(codingAgentHexa);

      const standardsHexa = registry.get(StandardsHexa);
      // StandardsHexa adapter might not be available yet (needs initialization)
      // We'll get it lazily or set it later after initialization
      let standardsPort: IStandardsPort | undefined;
      try {
        standardsPort = standardsHexa.getAdapter();
        adapter.updateStandardsPort(standardsPort);
      } catch {
        // StandardsHexa not initialized yet - will be set later
        this.logger.debug(
          'StandardsHexa adapter not available yet, will be set after initialization',
        );
      }

      // Get AccountsHexa adapter for user and organization providers
      try {
        const accountsHexa = registry.get(AccountsHexa);
        const accountsAdapter = accountsHexa.getAdapter();
        this.setAccountProviders(
          accountsAdapter as unknown as UserProvider,
          accountsAdapter as unknown as OrganizationProvider,
        );
      } catch {
        // AccountsHexa not available - optional dependency
        this.logger.debug('AccountsHexa not available in registry');
      }

      // Get SpacesHexa to retrieve spaces adapter
      try {
        const spacesHexa = registry.get(SpacesHexa);
        const spacesPort = spacesHexa.getAdapter();
        this.setSpacesAdapter(spacesPort);
      } catch {
        // SpacesHexa not available - optional dependency
        this.logger.debug('SpacesHexa not available in registry');
      }

      // Set standards port if available
      if (standardsPort) {
        adapter.updateStandardsPort(standardsPort);
      }

      this.logger.info('DeploymentsHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize DeploymentsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Destroys the DeploymentsHexa and cleans up resources
   */
  public destroy(): void {
    this.logger.info('Destroying DeploymentsHexa');
    // Add any cleanup logic here if needed
    this.logger.info('DeploymentsHexa destroyed');
  }

  /**
   * Get the Deployments adapter for cross-domain access to deployments data.
   * This adapter implements IDeploymentPort and can be injected into other domains.
   * The adapter is available immediately after construction.
   */
  public getAdapter(): IDeploymentPort {
    return this.deploymentsUsecases;
  }

  /**
   * Get the port name for this hexa.
   */
  public getPortName(): string {
    return IDeploymentPortName;
  }

  public setAccountProviders(
    userProvider: UserProvider,
    organizationProvider: OrganizationProvider,
  ): void {
    (this.deploymentsUsecases as DeploymentsAdapter).setAccountProviders(
      userProvider,
      organizationProvider,
    );
    this.logger.info('Account providers set in DeploymentsHexa');
  }

  public setSpacesAdapter(spacesPort: ISpacesPort): void {
    (this.deploymentsUsecases as DeploymentsAdapter).updateSpacesPort(
      spacesPort,
    );
    this.logger.info('Spaces adapter set in DeploymentsHexa');
  }
}
