import { ISkillDeployer, SkillDeployOptions } from './IDefaultSkillDeployer';
import { FileUpdates } from '@packmind/types';
import semver from 'semver';

type IntString = `${bigint}`;
export type SemVer = `${IntString}.${IntString}.${IntString}`;

export type SkillMD = {
  fontmatter: string;
  title: string;
  getPrompt: (agentName: string) => string;
  versions: SemVer[];
};

export abstract class AbstractDefaultSkillDeployer implements ISkillDeployer {
  protected abstract minimumVersion: SemVer | 'unreleased';
  abstract slug: string;

  protected getSkillMd(agentName: string, skill: SkillMD) {
    return `---
name: ${this.slug}
${skill.fontmatter}
---

# ${skill.title}
${skill.versions.length > 0 ? this.injectVersionsPrompt(skill.versions) : ''}
${skill.getPrompt(agentName)}
`;
  }

  isBetaSkill(): boolean {
    return this.minimumVersion === 'unreleased';
  }

  isSupportedByCliVersion(cliVersion: string | undefined): boolean {
    if (this.minimumVersion === 'unreleased') return false;

    return cliVersion
      ? semver.lte(this.minimumVersion, cliVersion.replace('-next', ''))
      : true;
  }

  private injectVersionsPrompt(versions: SemVer[]) {
    return `Run "packmind-cli --version" to get the current cli installation.
    
Find the highest version at or below the cli version in this list:
${versions.map((v) => `- ${v}`).join('\n')}
Remember this value as $PACKMIND_CLI_VERSION for the rest of the skill.
`;
  }

  abstract deploy(
    agentName: string,
    skillsFolderPath: string,
    options?: SkillDeployOptions,
  ): FileUpdates;
}
