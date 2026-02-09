import { ICodingAgentDeployer } from './ICodingAgentDeployer';
import { CodingAgent } from '@packmind/types';

export interface ICodingAgentDeployerRegistry {
  getDeployer(agent: CodingAgent): ICodingAgentDeployer;
  registerDeployer(agent: CodingAgent, deployer: ICodingAgentDeployer): void;
  hasDeployer(agent: CodingAgent): boolean;
}
