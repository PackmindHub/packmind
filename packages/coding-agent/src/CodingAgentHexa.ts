import { BaseHexa, HexaRegistry, PackmindLogger } from '@packmind/shared';
import { FileUpdates } from './domain/entities/FileUpdates';
import { CodingAgentHexaFactory } from './CodingAgentHexaFactory';
import { PrepareRecipesDeploymentCommand } from './domain/useCases/IPrepareRecipesDeploymentUseCase';
import { PrepareStandardsDeploymentCommand } from './domain/useCases/IPrepareStandardsDeploymentUseCase';

const origin = 'CodingAgentHexa';

/**
 * CodingAgentHexa - Facade for the CodingAgent domain following the Hexa pattern.
 *
 * This class serves as the main entry point for coding agent deployment functionality.
 * It handles the preparation of file updates for deploying recipes and standards
 * across multiple coding agent platforms (like Packmind, etc.).
 *
 * The Hexa pattern separates concerns:
 * - CodingAgentHexaFactory: Handles dependency injection and service instantiation
 * - CodingAgentHexa: Serves as use case facade and integration point with other domains
 *
 * The class aggregates deployment logic from multiple coding agents and provides
 * unified file updates for git operations.
 */
export class CodingAgentHexa extends BaseHexa {
  private readonly hexa: CodingAgentHexaFactory;
  private readonly logger: PackmindLogger;

  constructor(
    registry: HexaRegistry,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(registry);

    this.logger = logger;
    this.logger.info('Initializing CodingAgentHexa');

    try {
      // Initialize the hexagon factory with registry for dependency injection
      this.hexa = new CodingAgentHexaFactory(registry, this.logger);
      this.logger.info('CodingAgentHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize CodingAgentHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Destroys the CodingAgentHexa and cleans up resources
   */
  public destroy(): void {
    this.logger.info('Destroying CodingAgentHexa');
    // Add any cleanup logic here if needed
    this.logger.info('CodingAgentHexa destroyed');
  }

  /**
   * Prepares file updates for deploying recipes across specified coding agents
   *
   * @param command - Command containing recipes, git repo, and coding agents
   * @returns Promise of aggregated file updates for all agents
   */
  public async prepareRecipesDeployment(
    command: PrepareRecipesDeploymentCommand,
  ): Promise<FileUpdates> {
    this.logger.info('Preparing recipes deployment', {
      recipesCount: command.recipeVersions.length,
      agentsCount: command.codingAgents.length,
      agents: command.codingAgents,
      gitRepoId: command.gitRepo.id,
    });

    const fileUpdates =
      await this.hexa.useCases.prepareRecipesDeployment(command);

    return fileUpdates;
  }

  /**
   * Prepares file updates for deploying standards across specified coding agents
   *
   * @param command - Command containing standards, git repo, and coding agents
   * @returns Promise of aggregated file updates for all agents
   */
  public async prepareStandardsDeployment(
    command: PrepareStandardsDeploymentCommand,
  ): Promise<FileUpdates> {
    this.logger.info('Preparing standards deployment', {
      standardsCount: command.standardVersions.length,
      agentsCount: command.codingAgents.length,
      agents: command.codingAgents,
      gitRepoId: command.gitRepo.id,
    });

    const fileUpdates =
      await this.hexa.useCases.prepareStandardsDeployment(command);

    return fileUpdates;
  }
}
