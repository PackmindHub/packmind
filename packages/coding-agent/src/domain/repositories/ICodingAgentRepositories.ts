import { ICodingAgentDeployerRegistry } from '../repository/ICodingAgentDeployerRegistry';

/**
 * ICodingAgentRepositories - Repository aggregator interface for the CodingAgent domain
 *
 * This interface serves as the main repository access point, aggregating all
 * individual repositories through getter methods. This pattern centralizes
 * repository instantiation and provides a clean dependency injection point.
 */
export interface ICodingAgentRepositories {
  /**
   * Get the coding agent deployer registry instance
   */
  getDeployerRegistry(): ICodingAgentDeployerRegistry;
}
