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

  /**
   * Human-readable name for the deployed default skill. Subclasses must
   * provide a stable string (typically the `SkillMD.title` they ship).
   *
   * Consumed by `DefaultSkillsMetadataEnricher` to stamp `artifactName` on
   * the deployer's `FileModification[]` so lockfile entries carry a useful
   * label.
   */
  abstract readonly name: string;

  /**
   * Numeric version for the deployed default skill. Default skills are
   * code-defined (not DB-persisted), so this is a stable marker rather than
   * a monotonic version counter — subclasses bump it when the skill's
   * content evolves in a way that downstream tooling should observe.
   *
   * Defaults to `1`. Consumed by `DefaultSkillsMetadataEnricher` to stamp
   * `artifactVersion` on the deployer's `FileModification[]` so lockfile
   * entries match the shape of user/package artifact entries.
   */
  readonly version: number = 1;

  protected getSkillMd(agentName: string, skill: SkillMD) {
    return `${this.getFrontMatter(skill, agentName)}

# ${skill.title}
${this.injectVersionsPrompt(skill.versions)}${skill.getPrompt(agentName)}
`;
  }

  isBetaSkill(): boolean {
    return this.minimumVersion === 'unreleased';
  }

  isDeprecated(): boolean {
    return this.unsupportedFromVersion !== null;
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
