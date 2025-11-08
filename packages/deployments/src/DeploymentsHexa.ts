import { DataSource } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, HexaRegistry, BaseHexaOpts } from '@packmind/node-utils';
import {
  IRecipesPort,
  ISpacesPort,
  IDeploymentPort,
  IStandardsPort,
} from '@packmind/types';
import { DeploymentsHexaFactory } from './DeploymentsHexaFactory';
import { DeploymentsAdapter } from './application/adapter/DeploymentsAdapter';
import { GitHexa } from '@packmind/git';
import { RecipesHexa } from '@packmind/recipes';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { StandardsHexa } from '@packmind/standards';
import { RecipesAdapter } from './adapters/RecipesAdapter';
import { UserProvider, OrganizationProvider } from '@packmind/types';

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
  private hexa?: DeploymentsHexaFactory;
  private deploymentsUsecases?: IDeploymentPort;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);
    this.logger.info('Constructing DeploymentsHexa');

    try {
      // Factory and adapter will be created in initialize(registry)
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
      const gitHexa = registry.get(GitHexa);
      const gitPort = gitHexa.getAdapter();

      // Initialize the hexagon factory
      this.hexa = new DeploymentsHexaFactory(
        this.logger,
        this.dataSource,
        gitPort,
      );

      // RecipesHexa might not be available during initialization due to circular dependency
      // Using adapter pattern to decouple from RecipesHexa
      let recipesPort: Partial<IRecipesPort> | undefined;
      try {
        const recipesHexa = registry.get(RecipesHexa);
        recipesPort = new RecipesAdapter(recipesHexa);
      } catch {
        // RecipesHexa will be resolved later when fully initialized
        recipesPort = undefined;
      }

      const codingAgentHexa = registry.get(CodingAgentHexa);
      const codingAgentPort = codingAgentHexa.getAdapter();
      const standardsHexa = registry.get(StandardsHexa);
      // StandardsHexa adapter might not be available yet (needs initialization)
      // We'll get it lazily or set it later after initialization
      let standardsPort: IStandardsPort | undefined;
      try {
        standardsPort = standardsHexa.getAdapter();
      } catch {
        // StandardsHexa not initialized yet - will be set later
        this.logger.debug(
          'StandardsHexa adapter not available yet, will be set after initialization',
        );
      }

      this.deploymentsUsecases = new DeploymentsAdapter(
        this.hexa,
        gitPort,
        recipesPort,
        codingAgentPort,
        standardsPort,
        codingAgentHexa, // Keep for getCodingAgentDeployerRegistry() - not in port
      );

      this.logger.info('DeploymentsHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize DeploymentsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Set the recipes port after initialization to avoid circular dependencies
   */
  public setRecipesPort(recipesHexa: RecipesHexa): void {
    const recipesPort = new RecipesAdapter(recipesHexa);
    // Update the use cases with the new recipes port
    (this.deploymentsUsecases as DeploymentsAdapter).updateRecipesPort(
      recipesPort,
    );
    this.logger.info('RecipesPort updated in DeploymentsHexa');
  }

  /**
   * Set the standards port after initialization
   */
  public setStandardsPort(standardsHexa: StandardsHexa): void {
    const standardsPort = standardsHexa.getAdapter();
    // Update the use cases with the new standards port
    (this.deploymentsUsecases as DeploymentsAdapter).updateStandardsPort(
      standardsPort,
    );
    this.logger.info('StandardsPort updated in DeploymentsHexa');
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
   * The adapter is available after initialization.
   */
  public getAdapter(): IDeploymentPort {
    if (!this.deploymentsUsecases) {
      throw new Error(
        'DeploymentsHexa not initialized. Call initialize() before using.',
      );
    }
    return this.deploymentsUsecases;
  }

  public setAccountProviders(
    userProvider: UserProvider,
    organizationProvider: OrganizationProvider,
  ): void {
    if (!this.deploymentsUsecases) {
      throw new Error(
        'DeploymentsHexa not initialized. Call initialize() before using.',
      );
    }
    (this.deploymentsUsecases as DeploymentsAdapter).setAccountProviders(
      userProvider,
      organizationProvider,
    );
    this.logger.info('Account providers set in DeploymentsHexa');
  }

  public setSpacesAdapter(spacesPort: ISpacesPort): void {
    if (!this.deploymentsUsecases) {
      throw new Error(
        'DeploymentsHexa not initialized. Call initialize() before using.',
      );
    }
    (this.deploymentsUsecases as DeploymentsAdapter).updateSpacesPort(
      spacesPort,
    );
    this.logger.info('Spaces adapter set in DeploymentsHexa');
  }
}
