import { PackmindLogger } from '@packmind/logger';
import { HexaRegistry } from '@packmind/node-utils';
import { StandardsHexa } from '@packmind/standards';
import { GitHexa } from '@packmind/git';
import { CodingAgentDeployerRegistry } from './infra/repositories/CodingAgentDeployerRegistry';
import { DeployerService } from './application/services/DeployerService';
import { CodingAgentServices } from './application/services/CodingAgentServices';
import { CodingAgentUseCases } from './application/useCases/CodingAgentUseCases';
import { ICodingAgentDeployerRegistry } from './domain/repository/ICodingAgentDeployerRegistry';

const origin = 'CodingAgentHexaFactory';

export class CodingAgentHexaFactory {
  private readonly deployerRegistry: ICodingAgentDeployerRegistry;
  private readonly deployerService: DeployerService;
  private readonly codingAgentServices: CodingAgentServices;
  public readonly useCases: CodingAgentUseCases;

  constructor(
    private readonly registry?: HexaRegistry,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('Initializing CodingAgentHexaFactory');

    try {
      // Try to get StandardsHexa and GitHexa from registry if available
      let standardsHexa: StandardsHexa | undefined;
      let gitHexa: GitHexa | undefined;
      if (this.registry) {
        try {
          // TODO: migrate with port/adapters
          standardsHexa = this.registry.get(StandardsHexa) || undefined;
          if (standardsHexa) {
            this.logger.debug('StandardsHexa found in registry');
          }
        } catch {
          this.logger.debug('StandardsHexa not available in registry');
        }

        try {
          // TODO: migrate with port/adapters
          gitHexa = this.registry.get(GitHexa) || undefined;
          if (gitHexa) {
            this.logger.debug('GitHexa found in registry');
          }
        } catch {
          this.logger.debug('GitHexa not available in registry');
        }
      }

      this.logger.debug('Creating deployer registry');
      this.deployerRegistry = new CodingAgentDeployerRegistry(
        standardsHexa,
        gitHexa,
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

      this.logger.debug('Creating use cases');
      this.useCases = new CodingAgentUseCases(
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
