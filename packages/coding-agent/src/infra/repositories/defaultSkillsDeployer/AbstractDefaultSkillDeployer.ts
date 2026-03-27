import { ISkillDeployer } from './IDefaultSkillDeployer';
import { FileUpdates } from '@packmind/types';
import semver from 'semver';

type IntString = `${bigint}`;
export type SemVer = `${IntString}.${IntString}.${IntString}`;

export abstract class AbstractDefaultSkillDeployer implements ISkillDeployer {
  protected abstract minimumVersion: SemVer | 'unreleased';
  abstract slug: string;

  isSupportedByCliVersion(cliVersion: string | undefined): boolean {
    if (this.minimumVersion === 'unreleased') return false;

    return cliVersion
      ? semver.lte(this.minimumVersion, cliVersion.replace('-next', ''))
      : true;
  }

  abstract deploy(agentName: string, skillsFolderPath: string): FileUpdates;
}
