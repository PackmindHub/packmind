import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import {
  ICodingAgentPort,
  ICodingAgentPortName,
  IGitPort,
  IGitPortName,
  IStandardsPort,
  IStandardsPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { CodingAgentAdapter } from './application/adapter/CodingAgentAdapter';
import { CodingAgentServices } from './application/services/CodingAgentServices';
import { DeployerService } from './application/services/DeployerService';
import { ICodingAgentRepositories } from './domain/repositories/ICodingAgentRepositories';
import { CodingAgentRepositories } from './infra/repositories/CodingAgentRepositories';

const origin = 'CodingAgentHexa';

/**
 * CodingAgentHexa - Hexagonal architecture facade for the CodingAgent domain.
 *
 * This class serves as the main entry point for coding agent deployment functionality.
 * It handles the preparation of file updates for deploying recipes and standards
 * across multiple coding agent platforms (like Packmind, Claude, Cursor, etc.).
 *
 * The class aggregates deployment logic from multiple coding agents and provides
 * unified file updates for git operations.
 */
export class CodingAgentHexa extends BaseHexa<BaseHexaOpts, ICodingAgentPort> {
  private codingAgentRepositories: ICodingAgentRepositories;
  private deployerService: DeployerService;
  private codingAgentServices: CodingAgentServices;
  private adapter: CodingAgentAdapter;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);
    this.logger.info('Constructing CodingAgentHexa');

    try {
      // Instantiate repositories without ports (will be recreated in initialize)
      this.codingAgentRepositories = new CodingAgentRepositories();

      // Instantiate services
      this.deployerService = new DeployerService(
        this.codingAgentRepositories,
        this.logger,
      );

      this.codingAgentServices = new CodingAgentServices(
        this.deployerService,
        this.logger,
      );

      // Instantiate adapter without dependencies (will be set in initialize)
      this.adapter = new CodingAgentAdapter(this.logger);

      this.logger.info('CodingAgentHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct CodingAgentHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initialize the hexa with access to the registry for port retrieval.
   */
  public async initialize(registry: HexaRegistry): Promise<void> {
    this.logger.info('Initializing CodingAgentHexa (adapter retrieval phase)');

    try {
      // Get all required ports - let errors propagate
      const standardsPort =
        registry.getAdapter<IStandardsPort>(IStandardsPortName);
      const gitPort = registry.getAdapter<IGitPort>(IGitPortName);

      // Recreate repositories with ports
      this.codingAgentRepositories = new CodingAgentRepositories(
        standardsPort,
        gitPort,
      );

      // Recreate services with new repositories
      this.deployerService = new DeployerService(
        this.codingAgentRepositories,
        this.logger,
      );

      this.codingAgentServices = new CodingAgentServices(
        this.deployerService,
        this.logger,
      );

      // Initialize adapter with ports, services, and repositories
      this.adapter.initialize({
        ports: {
          [IStandardsPortName]: standardsPort,
          [IGitPortName]: gitPort,
        },
        services: this.codingAgentServices,
        repositories: this.codingAgentRepositories,
      });

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
   * Gets the coding agent deployer registry for direct access to deployers
   */
  public getCodingAgentDeployerRegistry() {
    return this.codingAgentRepositories.getDeployerRegistry();
  }

  /**
   * Get the deployer service for direct access to deployment operations
   */
  public getDeployerService(): DeployerService {
    return this.deployerService;
  }

  /**
   * Get the CodingAgent adapter for cross-domain access
   * Following DDD monorepo architecture standard
   */
  public getAdapter(): ICodingAgentPort {
    return this.adapter;
  }

  /**
   * Get the port name for this hexa.
   */
  public getPortName(): string {
    return ICodingAgentPortName;
  }
}
