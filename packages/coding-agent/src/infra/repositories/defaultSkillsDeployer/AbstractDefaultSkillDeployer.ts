import { ISkillDeployer, SkillDeployOptions } from './IDefaultSkillDeployer';
import { FileUpdates } from '@packmind/types';
import semver from 'semver';

type IntString = `${bigint}`;
export type SemVer = `${IntString}.${IntString}.${IntString}`;

/**
 * Canonical name of the Packmind CLI executable.
 */
export const PACKMIND_EXEC_NAME = 'packmind';

/**
 * Name the Packmind CLI executable shipped under before the rename.
 */
export const LEGACY_PACKMIND_EXEC_NAME = 'packmind-cli';

/**
 * CLI release that introduced the `packmind` executable. Installations older
 * than this only expose `packmind-cli`, so unversioned skill content rendered
 * for them must keep naming the legacy executable — telling those users to run
 * `packmind` points them at a binary they do not have.
 */
export const PACKMIND_EXEC_NAME_SINCE_VERSION: SemVer = '0.24.0';

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

  protected getSkillMd(agentName: string, skill: SkillMD, execName: string) {
    return `${this.getFrontMatter(skill, agentName)}

# ${skill.title}
${this.injectVersionsPrompt(skill.versions, execName)}${skill.getPrompt(agentName, execName)}
`;
  }

  /**
   * Name of the CLI executable the target installation actually exposes.
   *
   * Unversioned skill content reaches every install at or above the skill's
   * `minimumVersion`, so the executable name is a render-time concern: it
   * depends on the CLI requesting the deployment, not on the skill.
   *
   * An unknown `cliVersion` (the web app deploying, for instance) gets the
   * canonical name.
   */
  protected resolveExecName(cliVersion: string | undefined): string {
    if (!cliVersion) return PACKMIND_EXEC_NAME;

    // A `0.24.0-next` build is a pre-release *of* 0.24.0, so it predates the
    // rename. semver already orders pre-releases below their release, hence the
    // raw version is preferred here and the normalised form is only a fallback
    // for inputs semver cannot parse on its own.
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
