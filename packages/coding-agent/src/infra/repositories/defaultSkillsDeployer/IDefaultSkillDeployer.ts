import { FileUpdates } from '@packmind/types';

export type SkillDeployOptions = {
  includeNext?: boolean;
};

export interface ISkillDeployer {
  slug: string;
  name: string;
  version: number;

  isBetaSkill(): boolean;

  isDeprecated(): boolean;

  isSupportedByCliVersion(cliVersion: string | undefined): boolean;

  deploy(
    agentName: string,
    skillsFolderPath: string,
    options?: SkillDeployOptions,
  ): FileUpdates;
}
