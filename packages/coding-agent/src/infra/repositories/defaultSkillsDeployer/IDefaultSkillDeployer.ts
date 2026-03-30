import { FileUpdates } from '@packmind/types';

export interface ISkillDeployer {
  slug: string;

  isBetaSkill(): boolean;

  isSupportedByCliVersion(cliVersion: string | undefined): boolean;

  deploy(agentName: string, skillsFolderPath: string): FileUpdates;
}
