import { TargetService } from './services/TargetService';
import { RenderModeConfigurationService } from './services/RenderModeConfigurationService';

/**
 * IDeploymentsServices - Service aggregator interface for the Deployments application layer
 *
 * This interface defines the contract for accessing all individual services
 * within the Deployments domain.
 */
export interface IDeploymentsServices {
  getTargetService(): TargetService;
  getRenderModeConfigurationService(): RenderModeConfigurationService;
}
