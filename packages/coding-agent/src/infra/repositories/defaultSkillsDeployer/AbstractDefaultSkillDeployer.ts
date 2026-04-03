import { ISkillDeployer, SkillDeployOptions } from './IDefaultSkillDeployer';
import { FileUpdates } from '@packmind/types';
import semver from 'semver';

type IntString = `${bigint}`;
export type SemVer = `${IntString}.${IntString}.${IntString}`;

export type SkillMD = {
  frontMatter: {
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
  protected abstract unsupportedFromVersion: SemVer | null;
  abstract slug: string;

  protected getSkillMd(agentName: string, skill: SkillMD) {
    return `${this.getFrontMatter(skill, agentName)}

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

  private getFrontMatter(skill: SkillMD, agentName: string): string {
    const frontMatter: string[] = [
      `name: '${this.slug}'`,
      `description: '${skill.frontMatter.description}'`,
    ];

    if (skill.frontMatter.license) {
      frontMatter.push(`license: '${skill.frontMatter.license}'`);
    }

    const metadata: Record<string, string> = { ...skill.frontMatter.metadata };
    if (this.unsupportedFromVersion) {
      metadata['packmind-cli-version'] = `< ${this.unsupportedFromVersion}`;
    }

    if (Object.entries(metadata).length) {
      frontMatter.push('metadata:');
      for (const [key, value] of Object.entries(metadata)) {
        frontMatter.push(` ${key}: "${value}"`);
      }
    }

    return `---
${frontMatter.join('\n')}
---`.replace('${agentName}', agentName);
  }
}
