import { BaseHexa, HexaRegistry, PackmindLogger } from '@packmind/shared';
import { IDeploymentPort } from '@packmind/shared';
import { DeploymentsHexaFactory } from './DeploymentsHexaFactory';
import { DeploymentsUseCases } from './application/useCases/index';
import { GitHexa } from '@packmind/git';
import { RecipesHexa } from '@packmind/recipes';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { StandardsHexa } from '@packmind/standards';

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
  private readonly logger: PackmindLogger;
  private readonly deploymentsUsecases: IDeploymentPort;

  constructor(
    registry: HexaRegistry,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(registry);

    this.logger = logger;
    this.logger.info('Initializing DeploymentsHexa');

    try {
      const dataSource = registry.getDataSource();
      this.logger.debug('Retrieved DataSource from registry');

      // Initialize the hexagon factory
      this.hexa = new DeploymentsHexaFactory(this.logger, dataSource, registry);

      //TODO: refactor using adapter pattern
      const gitHexa = registry.get(GitHexa);
      const recipesHexa = registry.get(RecipesHexa);
      const codingAgentHexa = registry.get(CodingAgentHexa);
      const standardsHexa = registry.get(StandardsHexa);

      this.deploymentsUsecases = new DeploymentsUseCases(
        this.hexa,
        gitHexa,
        recipesHexa,
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
}
