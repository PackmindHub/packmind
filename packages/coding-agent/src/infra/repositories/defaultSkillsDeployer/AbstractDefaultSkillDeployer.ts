import { ISkillDeployer, SkillDeployOptions } from './IDefaultSkillDeployer';
import { FileUpdates } from '@packmind/types';
import semver from 'semver';

type IntString = `${bigint}`;
export type SemVer = `${IntString}.${IntString}.${IntString}`;

const PACKMIND_EXEC_NAME = 'packmind';

const LEGACY_PACKMIND_EXEC_NAME = 'packmind-cli';

/**
 * CLI release that introduced the `packmind` executable. Older installations
 * only expose `packmind-cli`, so skill content rendered for them must keep
 * naming the legacy executable — telling those users to run `packmind` points
 * them at a binary they do not have.
 */
const PACKMIND_EXEC_NAME_SINCE_VERSION: SemVer = '0.24.0';

/**
 * Drops the `-next` pre-release suffix so an in-development build compares as
 * the release it is heading for.
 */
const normalizeCliVersion = (cliVersion: string): string =>
  cliVersion.replace('-next', '');

export type SkillMD = {
  frontMatter: {
    description: string;
    license?: string;
    metadata?: Record<string, string>;
  };
  title: string;
  getPrompt: (agentName: string, execName: string) => string;
  versions: SemVer[];
};

export abstract class AbstractDefaultSkillDeployer implements ISkillDeployer {
  protected abstract minimumVersion: SemVer | 'unreleased';
  protected abstract unsupportedFromVersion: SemVer | null;
  abstract slug: string;

  /**
   * Stamped as `artifactName` on emitted `FileModification[]` by
   * `enrichDefaultSkillsFileModifications`, so it must stay stable across
   * renders — lockfile entries key off it.
   */
  abstract readonly name: string;

  /**
   * Stamped as `artifactVersion` by `enrichDefaultSkillsFileModifications`.
   * Default skills are code-defined rather than DB-persisted, so this is a
   * marker subclasses bump when content changes, not a monotonic counter.
   */
  readonly version: number = 1;

  protected getSkillMd(agentName: string, skill: SkillMD, execName: string) {
    return `${this.getFrontMatter(skill, agentName)}

# ${skill.title}
${this.injectVersionsPrompt(skill.versions, execName)}${skill.getPrompt(agentName, execName)}
`;
  }

  /**
   * Name of the CLI executable the target installation actually exposes. This
   * is a render-time concern: it depends on the CLI requesting the deployment,
   * not on the skill. An unknown `cliVersion` (the web app deploying, for
   * instance) gets the canonical name.
   */
  protected resolveExecName(cliVersion: string | undefined): string {
    if (!cliVersion) return PACKMIND_EXEC_NAME;

    // A `0.24.0-next` build is a pre-release *of* 0.24.0, so it predates the
    // rename. semver orders pre-releases below their release, so the raw
    // version is preferred over the normalised one here.
    const version =
      semver.valid(cliVersion) ?? semver.valid(normalizeCliVersion(cliVersion));

    if (!version) return PACKMIND_EXEC_NAME;

    return semver.lt(version, PACKMIND_EXEC_NAME_SINCE_VERSION)
      ? LEGACY_PACKMIND_EXEC_NAME
      : PACKMIND_EXEC_NAME;
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
      ? semver.lte(this.minimumVersion, normalizeCliVersion(cliVersion))
      : true;
  }

  private injectVersionsPrompt(versions: SemVer[], execName: string) {
    if (versions.length === 0) return '';

    return `Run "${execName} --version" to get the current cli installation.

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
