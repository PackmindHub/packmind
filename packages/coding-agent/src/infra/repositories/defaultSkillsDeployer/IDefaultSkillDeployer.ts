import { FileUpdates } from '@packmind/types';

export interface ISkillDeployer {
  minimumVersion: string;
  deploy(agentName: string, skillsFolderPath: string): FileUpdates;
}
