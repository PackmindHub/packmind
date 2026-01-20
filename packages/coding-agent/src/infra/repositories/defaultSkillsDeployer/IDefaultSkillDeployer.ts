import { FileUpdates } from '@packmind/types';

export interface IDeploySkillsDeployer {
  deploy(agentName: string, skillsFolderPath: string): FileUpdates;
}
