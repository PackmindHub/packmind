import { TargetService } from './TargetService';
import { PackmindLogger } from '@packmind/logger';
import { RenderModeConfigurationService } from './RenderModeConfigurationService';
import { IDeploymentsRepositories } from '../../domain/repositories/IDeploymentsRepositories';

/**
 * DeploymentsServices - Service aggregator for the Deployments application layer
 *
 * This class serves as the main service access point, aggregating all
 * individual services. It handles the instantiation of services
 * using the repository aggregator and provides them through getter methods.
 */
export class DeploymentsServices {
  private readonly targetService: TargetService;
  private readonly renderModeConfigurationService: RenderModeConfigurationService;

  constructor(
    private readonly deploymentsRepositories: IDeploymentsRepositories,
    private readonly logger: PackmindLogger,
  ) {
    // Initialize all services with their respective repositories from the aggregator
    this.targetService = new TargetService(
      this.deploymentsRepositories.getTargetRepository(),
      this.logger,
    );
    this.renderModeConfigurationService = new RenderModeConfigurationService(
      this.deploymentsRepositories.getRenderModeConfigurationRepository(),
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
