import { ISkillDeployer } from './IDefaultSkillDeployer';
import { FileUpdates } from '@packmind/types';
import semver from 'semver';

type IntString = `${bigint}`;
export type SemVer = `${IntString}.${IntString}.${IntString}`;

export type SkillMD = {
  fontMatter: {
    description: string;
    license?: string;
    metadata?: Record<string, string>;
  };
  title: string;
  getPrompt: (agentName: string) => string;
  versions: SemVer[];
};

export abstract class AbstractDefaultSkillDeployer implements ISkillDeployer {
  protected abstract minimumVersion: SemVer | 'unreleased';
  protected abstract maximumVersion: SemVer | null;
  abstract slug: string;

  protected getSkillMd(agentName: string, skill: SkillMD) {
    return `${this.getFontMatter(skill, agentName)}

# ${skill.title}
${this.injectVersionsPrompt(skill.versions)}${skill.getPrompt(agentName)}
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
    if (versions.length === 0) return '';

    return `Run "packmind-cli --version" to get the current cli installation.
    
Find the highest version below the cli version in this list: ${versions.join('\n')}.
Remember this value as $PACKMIND_CLI_VERSION for the rest of the skill.

`;
  }

  abstract deploy(agentName: string, skillsFolderPath: string): FileUpdates;

  private getFontMatter(skill: SkillMD, agentName: string): string {
    const fontMatter: string[] = [
      `name: '${this.slug}'`,
      `description: '${skill.fontMatter.description}'`,
    ];

    if (skill.fontMatter.license) {
      fontMatter.push(`license: '${skill.fontMatter.license}'`);
    }

    const metadata: Record<string, string> = { ...skill.fontMatter.metadata };
    if (this.maximumVersion) {
      metadata['packmind-cli-version'] = `< ${this.maximumVersion}`;
    }

    if (Object.entries(metadata).length) {
      fontMatter.push('metadata:');
      for (const [key, value] of Object.entries(metadata)) {
        fontMatter.push(` ${key}: "${value}"`);
      }
    }

    return `---
${fontMatter.join('\n')}
---`.replace('${agentName}', agentName);
  }
}
