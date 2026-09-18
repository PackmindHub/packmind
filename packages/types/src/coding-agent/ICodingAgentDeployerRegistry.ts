import { CodingAgent } from './CodingAgent';

/**
 * `unknown` on purpose: the real deployer type lives in `@packmind/coding-agent`,
 * which depends on this package, so naming it here would be circular.
 */
export type ICodingAgentDeployer = unknown;

export interface ICodingAgentDeployerRegistry {
  getDeployer(agent: CodingAgent): ICodingAgentDeployer;

  registerDeployer(agent: CodingAgent, deployer: ICodingAgentDeployer): void;

  hasDeployer(agent: CodingAgent): boolean;
}
