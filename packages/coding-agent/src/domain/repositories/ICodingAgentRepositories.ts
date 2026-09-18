import { ICodingAgentDeployerRegistry } from '../repository/ICodingAgentDeployerRegistry';

export interface ICodingAgentRepositories {
  getDeployerRegistry(): ICodingAgentDeployerRegistry;
}
