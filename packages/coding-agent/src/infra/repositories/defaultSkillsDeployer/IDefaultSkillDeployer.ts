import { FileUpdates } from '@packmind/types';

export type SkillDeployOptions = {
  includeNext?: boolean;
};

export interface ISkillDeployer {
  slug: string;

  isBetaSkill(): boolean;

  isSupportedByCliVersion(cliVersion: string | undefined): boolean;

  deploy(
    agentName: string,
    skillsFolderPath: string,
    options?: SkillDeployOptions,
  ): FileUpdates;
}
