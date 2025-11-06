import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, HexaRegistry, BaseHexaOpts } from '@packmind/node-utils';
import { IRecipesPort, ISpacesPort, IDeploymentPort } from '@packmind/types';
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
export class DeploymentsHexa extends BaseHexa {
  private readonly hexa: DeploymentsHexaFactory;
  private readonly deploymentsUsecases: IDeploymentPort;

  constructor(
    registry: HexaRegistry,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(registry, opts);
    this.logger.info('Initializing DeploymentsHexa');

    try {
      const dataSource = registry.getDataSource();

      // Initialize the hexagon factory
      this.hexa = new DeploymentsHexaFactory(this.logger, dataSource, registry);

      const gitHexa = registry.get(GitHexa);

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
      const standardsHexa = registry.get(StandardsHexa);

      this.deploymentsUsecases = new DeploymentsAdapter(
        this.hexa,
        gitHexa,
        recipesPort,
        codingAgentHexa,
        standardsHexa,
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
   * Destroys the DeploymentsHexa and cleans up resources
   */
  public destroy(): void {
    this.logger.info('Destroying DeploymentsHexa');
    // Add any cleanup logic here if needed
    this.logger.info('DeploymentsHexa destroyed');
  }

  public getDeploymentsUseCases(): IDeploymentPort {
    return this.deploymentsUsecases;
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
