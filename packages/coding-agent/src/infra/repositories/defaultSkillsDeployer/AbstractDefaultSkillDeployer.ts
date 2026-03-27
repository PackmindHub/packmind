import { ISkillDeployer } from './IDefaultSkillDeployer';
import { FileUpdates } from '@packmind/types';
import semver from 'semver';

type IntString = `${bigint}`;
export type SemVer = `${IntString}.${IntString}.${IntString}`;

export type SkillMD = {
  fontmatter: string;
  title: string;
  getPrompt: (agentName: string) => string;
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

  abstract deploy(agentName: string, skillsFolderPath: string): FileUpdates;
}
