import { CodingAgent } from './CodingAgent';

/**
 * Type for coding agent deployer (implementation details)
 * Using unknown as this is defined in the coding-agent package
 */
export type ICodingAgentDeployer = unknown;

/**
 * Registry for managing coding agent deployers
 */
export interface ICodingAgentDeployerRegistry {
  /**
   * Get a deployer for a specific coding agent
   * @param agent - The coding agent type
   * @returns The deployer for the specified agent
   */
  getDeployer(agent: CodingAgent): ICodingAgentDeployer;

  /**
   * Register a deployer for a coding agent
   * @param agent - The coding agent type
   * @param deployer - The deployer implementation
   */
  registerDeployer(agent: CodingAgent, deployer: ICodingAgentDeployer): void;

  /**
   * Check if a deployer is registered for a coding agent
   * @param agent - The coding agent type
   * @returns True if a deployer is registered
   */
  hasDeployer(agent: CodingAgent): boolean;
}
