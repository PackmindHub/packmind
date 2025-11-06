import { IDeploymentsServices } from '../IDeploymentsServices';
import { TargetService } from './TargetService';
import { ITargetRepository } from '../../domain/repositories/ITargetRepository';
import { PackmindLogger } from '@packmind/logger';
import { IGitPort } from '@packmind/types';
import { RenderModeConfigurationService } from './RenderModeConfigurationService';
import { IRenderModeConfigurationRepository } from '../../domain/repositories/IRenderModeConfigurationRepository';

/**
 * DeploymentsServices - Service aggregator implementation for the Deployments application layer
 *
 * This class serves as the main service access point, aggregating all
 * individual services. It handles the instantiation of services
 * using repositories and provides them through getter methods.
 */
export class DeploymentsServices implements IDeploymentsServices {
  private readonly targetService: TargetService;
  private readonly renderModeConfigurationService: RenderModeConfigurationService;

  constructor(
    private readonly targetRepository: ITargetRepository,
    private readonly gitPort: IGitPort,
    private readonly renderModeConfigurationRepository: IRenderModeConfigurationRepository,
    private readonly logger: PackmindLogger,
  ) {
    // Initialize all services with their respective repositories
    this.targetService = new TargetService(
      this.targetRepository,
      this.gitPort,
      this.logger,
    );
    this.renderModeConfigurationService = new RenderModeConfigurationService(
      this.renderModeConfigurationRepository,
      this.logger,
    );
  }

  getTargetService(): TargetService {
    return this.targetService;
  }

  getRenderModeConfigurationService(): RenderModeConfigurationService {
    return this.renderModeConfigurationService;
  }
}
