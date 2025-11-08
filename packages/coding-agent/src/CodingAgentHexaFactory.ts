import { PackmindLogger } from '@packmind/logger';
import { HexaRegistry } from '@packmind/node-utils';
import { StandardsHexa } from '@packmind/standards';
import { GitHexa } from '@packmind/git';
import { IStandardsPort, IGitPort } from '@packmind/types';
import { CodingAgentDeployerRegistry } from './infra/repositories/CodingAgentDeployerRegistry';
import { DeployerService } from './application/services/DeployerService';
import { CodingAgentServices } from './application/services/CodingAgentServices';
import { CodingAgentAdapter } from './application/adapter/CodingAgentAdapter';
import { ICodingAgentDeployerRegistry } from './domain/repository/ICodingAgentDeployerRegistry';

const origin = 'CodingAgentHexaFactory';

export class CodingAgentHexaFactory {
  private deployerRegistry: ICodingAgentDeployerRegistry;
  private deployerService: DeployerService;
  private codingAgentServices: CodingAgentServices;
  public adapter: CodingAgentAdapter;

  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('Constructing CodingAgentHexaFactory');

    try {
      // Create deployer registry without ports initially (will be set in initialize)
      this.logger.debug('Creating deployer registry');
      this.deployerRegistry = new CodingAgentDeployerRegistry(
        undefined,
        undefined,
      );

      this.logger.debug('Creating deployer service');
      this.deployerService = new DeployerService(
        this.deployerRegistry,
        this.logger,
      );

      this.logger.debug('Creating coding agent services');
      this.codingAgentServices = new CodingAgentServices(
        this.deployerService,
        this.logger,
      );

      this.logger.debug('Creating adapter');
      this.adapter = new CodingAgentAdapter(
        this.codingAgentServices,
        this.logger,
      );

      this.logger.info('CodingAgentHexaFactory construction completed');
    } catch (error) {
      this.logger.error('Failed to construct CodingAgentHexaFactory', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initialize with adapters from registry
   */
  public initialize(registry: HexaRegistry): void {
    this.logger.info(
      'Initializing CodingAgentHexaFactory (adapter retrieval phase)',
    );

    try {
      // Try to get StandardsPort and GitPort from registry if available
      let standardsPort: IStandardsPort | undefined;
      let gitPort: IGitPort | undefined;
      try {
        const standardsHexa = registry.get(StandardsHexa);
        if (standardsHexa) {
          standardsPort = standardsHexa.getAdapter();
          this.logger.debug('StandardsPort found in registry');
        }
      } catch {
        this.logger.debug('StandardsHexa not available in registry');
      }

      try {
        const gitHexa = registry.get(GitHexa);
        if (gitHexa) {
          gitPort = gitHexa.getAdapter();
          this.logger.debug('GitPort found in registry');
        }
      } catch {
        this.logger.debug('GitHexa not available in registry');
      }

      // Recreate deployer registry with ports
      this.deployerRegistry = new CodingAgentDeployerRegistry(
        standardsPort,
        gitPort,
      );
      // Recreate deployer service with new registry
      this.deployerService = new DeployerService(
        this.deployerRegistry,
        this.logger,
      );
      // Recreate coding agent services with new deployer service
      this.codingAgentServices = new CodingAgentServices(
        this.deployerService,
        this.logger,
      );
      // Recreate adapter with new services
      this.adapter = new CodingAgentAdapter(
        this.codingAgentServices,
        this.logger,
      );

      this.logger.info('CodingAgentHexaFactory initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize CodingAgentHexaFactory', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get the deployer registry for manual registration of deployers
   */
  getDeployerRegistry(): ICodingAgentDeployerRegistry {
    return this.deployerRegistry;
  }

  /**
   * Get the deployer service for direct access to deployment operations
   */
  getDeployerService(): DeployerService {
    return this.deployerService;
  }
}
