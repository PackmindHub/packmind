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
  private readonly deployerRegistry: ICodingAgentDeployerRegistry;
  private readonly deployerService: DeployerService;
  private readonly codingAgentServices: CodingAgentServices;
  public readonly adapter: CodingAgentAdapter;

  constructor(
    private readonly registry?: HexaRegistry,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('Initializing CodingAgentHexaFactory');

    try {
      // Try to get StandardsPort and GitPort from registry if available
      let standardsPort: IStandardsPort | undefined;
      let gitPort: IGitPort | undefined;
      if (this.registry) {
        try {
          const standardsHexa = this.registry.get(StandardsHexa);
          if (standardsHexa) {
            standardsPort = standardsHexa.getAdapter();
            this.logger.debug('StandardsPort found in registry');
          }
        } catch {
          this.logger.debug('StandardsHexa not available in registry');
        }

        try {
          const gitHexa = this.registry.get(GitHexa);
          if (gitHexa) {
            gitPort = gitHexa.getAdapter();
            this.logger.debug('GitPort found in registry');
          }
        } catch {
          this.logger.debug('GitHexa not available in registry');
        }
      }

      this.logger.debug('Creating deployer registry');
      this.deployerRegistry = new CodingAgentDeployerRegistry(
        standardsPort,
        gitPort,
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
