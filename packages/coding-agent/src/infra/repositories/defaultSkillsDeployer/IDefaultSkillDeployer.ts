import { FileUpdates } from '@packmind/types';

export interface ISkillDeployer {
  slug: string;

  isSupportedByCliVersion(cliVersion: string | undefined): boolean;

  deploy(agentName: string, skillsFolderPath: string): FileUpdates;
}
