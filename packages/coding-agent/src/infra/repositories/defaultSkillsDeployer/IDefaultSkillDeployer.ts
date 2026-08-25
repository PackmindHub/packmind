import { FileUpdates } from '@packmind/types';

export type SkillDeployOptions = {
  includeNext?: boolean;
  /**
   * Version of the CLI requesting the deployment. Drives which executable name
   * unversioned skill content names (see
   * `AbstractDefaultSkillDeployer.resolveExecName`). Undefined when the caller
   * is not a CLI (the web app, for instance).
   */
  cliVersion?: string;
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
