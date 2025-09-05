import { CodingAgent } from '../CodingAgents';
import { ICodingAgentDeployer } from './ICodingAgentDeployer';

export interface ICodingAgentDeployerRegistry {
  getDeployer(agent: CodingAgent): ICodingAgentDeployer;
  registerDeployer(agent: CodingAgent, deployer: ICodingAgentDeployer): void;
  hasDeployer(agent: CodingAgent): boolean;
}
