import { FileUpdates } from '@packmind/types';

export interface ISkillDeployer {
  deploy(agentName: string, skillsFolderPath: string): FileUpdates;
}
