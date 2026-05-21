import {
  IInstallDefaultSkillsCommand,
  IInstallDefaultSkillsResult,
  IInstallDefaultSkillsUseCase,
  IncompatibleInstalledSkill,
} from '../../domain/useCases/IInstallDefaultSkillsUseCase';
import { IPackmindRepositories } from '../../domain/repositories/IPackmindRepositories';
import * as fs from 'fs/promises';
import * as path from 'path';
import semver from 'semver';
import { parseSkillMdContent } from '@packmind/node-utils';
import { stripPrerelease } from '../utils/normalizeSemver';
import {
  PackmindLockFile,
  PackmindLockFileEntry,
} from '../../domain/repositories/PackmindLockFile';
import {
  CodingAgent,
  DEFAULT_ACTIVE_RENDER_MODES,
  RENDER_MODE_TO_CODING_AGENT,
} from '@packmind/types';
import { SkillsInitBootstrapError } from '../../domain/errors/SkillsInitBootstrapError';

export class InstallDefaultSkillsUseCase implements IInstallDefaultSkillsUseCase {
  constructor(private readonly repositories: IPackmindRepositories) {}

  public async execute(
    command: IInstallDefaultSkillsCommand,
  ): Promise<IInstallDefaultSkillsResult> {
    const baseDirectory = command.baseDirectory || process.cwd();

    await this.bootstrapEmptyDirectory(baseDirectory);

    const result: IInstallDefaultSkillsResult = {
      filesCreated: 0,
      filesUpdated: 0,
      errors: [],
      skippedSkillsCount: 0,
      skippedIncompatibleSkillNames: [],
      incompatibleInstalledSkills: [],
    };

    // Read agents configuration from packmind.json
    const config =
      await this.repositories.configFileRepository.readConfig(baseDirectory);
    const agents = config?.agents;

    // Fetch default skills from the gateway
    // Note: userId and organizationId are extracted from the API key by the gateway
    const response = await this.repositories.packmindGateway.skills.getDefaults(
      {
        cliVersion: command.cliVersion,
        includeBeta: command.includeBeta,
        agents,
      },
    );

    result.skippedSkillsCount = response.skippedSkillsCount;

    // Group incompatible installed skills by name (one skill may have multiple agent replicas)
    const incompatibleInstalledMap = new Map<string, string[]>();

    // First pass: identify incompatible skill folders from their SKILL.md files so that
    // companion files (README.md, LICENSE.txt) can be tracked for deletion too.
    const incompatibleSkillDirs = new Map<string, string>(); // dir path -> skill name
    if (command.cliVersion) {
      for (const file of response.fileUpdates.createOrUpdate) {
        if (
          path.basename(file.path) === 'SKILL.md' &&
          file.content &&
          this.isVersionConstraintViolated(file.content, command.cliVersion)
        ) {
          const dir = path.dirname(file.path);
          const skillName =
            this.getSkillName(file.content) ?? path.basename(dir);
          incompatibleSkillDirs.set(dir, skillName);
        }
      }
    }

    try {
      // Process createOrUpdate files
      for (const file of response.fileUpdates.createOrUpdate) {
        try {
          if (!file.content) continue;

          const isIncompatible =
            command.cliVersion &&
            (this.isVersionConstraintViolated(
              file.content,
              command.cliVersion,
            ) ||
              this.isUnderIncompatibleSkillDir(
                file.path,
                incompatibleSkillDirs,
              ));

          if (isIncompatible) {
            const skillName =
              this.getSkillName(file.content) ??
              this.getSkillNameForPath(file.path, incompatibleSkillDirs) ??
              path.basename(file.path);
            const fullPath = path.join(baseDirectory, file.path);
            const fileAlreadyInstalled = await this.fileExists(fullPath);

            if (fileAlreadyInstalled) {
              const paths = incompatibleInstalledMap.get(skillName) ?? [];
              paths.push(file.path);
              incompatibleInstalledMap.set(skillName, paths);
            } else {
              if (!result.skippedIncompatibleSkillNames.includes(skillName)) {
                result.skippedIncompatibleSkillNames.push(skillName);
              }
            }
            continue;
          }

          await this.createOrUpdateFile(baseDirectory, file, result);
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          result.errors.push(
            `Failed to create/update ${file.path}: ${errorMsg}`,
          );
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to install default skills: ${errorMsg}`);
    }

    result.incompatibleInstalledSkills = Array.from(
      incompatibleInstalledMap.entries(),
    ).map(
      ([skillName, filePaths]): IncompatibleInstalledSkill => ({
        skillName,
        filePaths,
      }),
    );

    await this.mergeLockFileSlice(
      baseDirectory,
      response.lockFileSlice ?? {},
      command.cliVersion,
    );

    return result;
  }

  /**
   * Merges the server-emitted default-skill `lockFileSlice` into the local
   * `packmind-lock.json`.
   *
   * - If no lockfile exists, a fresh `lockfileVersion: 2` lockfile is created
   *   containing only the default-skill entries.
   * - Otherwise the existing lockfile is loaded (with silent v1→v2 migration
   *   performed by {@link LockFileRepository.read}) and the slice is merged
   *   into `artifacts` via spread-replace by key. All other top-level fields
   *   are preserved.
   *
   * User-authored and package-distributed entries (`user:...` keys) are NEVER
   * touched by this merge — they remain byte-equal across invocations. This
   * preservation is a hard safety invariant enforced by the unit-level
   * regression test in {@link InstallDefaultSkillsUseCase.spec.ts}.
   */
  private async mergeLockFileSlice(
    baseDirectory: string,
    lockFileSlice: Record<string, PackmindLockFileEntry>,
    cliVersion?: string,
  ): Promise<void> {
    const existing =
      await this.repositories.lockFileRepository.read(baseDirectory);

    let lockFile: PackmindLockFile;
    if (existing === null) {
      lockFile = {
        lockfileVersion: 2,
        cliVersion,
        packageSlugs: [],
        agents: [],
        artifacts: { ...lockFileSlice },
      };
    } else {
      lockFile = {
        ...existing,
        lockfileVersion: 2,
        artifacts: {
          ...existing.artifacts,
          ...lockFileSlice,
        },
      };
    }

    await this.repositories.lockFileRepository.write(baseDirectory, lockFile);
  }

  /**
   * Bootstraps a truly fresh directory (no packmind.json AND no
   * packmind-lock.json) by querying the org's active render modes from the
   * deployment gateway, mapping them through {@link RENDER_MODE_TO_CODING_AGENT},
   * and writing the resulting `CodingAgent[]` to packmind.json via
   * {@link IConfigFileRepository.updateAgentsConfig}.
   *
   * If either file is already present, this is a strict no-op — existing
   * configuration is never modified. If the gateway call fails or returns
   * zero mapped agents, a {@link SkillsInitBootstrapError} is thrown so the
   * CLI handler can surface a directive message pointing at `packmind init`.
   */
  public async bootstrapEmptyDirectory(baseDirectory: string): Promise<void> {
    const config =
      await this.repositories.configFileRepository.readConfig(baseDirectory);
    const lockFile =
      await this.repositories.lockFileRepository.read(baseDirectory);

    if (config !== null || lockFile !== null) {
      return;
    }

    let configuration;
    try {
      const result =
        await this.repositories.packmindGateway.deployment.getRenderModeConfiguration(
          {},
        );
      configuration = result.configuration;
    } catch {
      throw new SkillsInitBootstrapError();
    }

    // Fresh org with no persisted RenderModeConfiguration row: mirror the
    // server-side fallback in RenderModeConfigurationService.getActiveRenderModes
    // and seed agents from DEFAULT_ACTIVE_RENDER_MODES so bootstrapping doesn't
    // fail on a clean install.
    const activeRenderModes =
      configuration === null
        ? DEFAULT_ACTIVE_RENDER_MODES
        : configuration.activeRenderModes;

    const agents: CodingAgent[] = activeRenderModes
      .map((mode) => RENDER_MODE_TO_CODING_AGENT[mode])
      .filter((agent): agent is CodingAgent => agent !== undefined);

    if (agents.length === 0) {
      throw new SkillsInitBootstrapError();
    }

    await this.repositories.configFileRepository.updateAgentsConfig(
      baseDirectory,
      agents,
    );
  }

  private async createOrUpdateFile(
    baseDirectory: string,
    file: {
      path: string;
      content: string;
    },
    result: IInstallDefaultSkillsResult,
  ): Promise<void> {
    const fullPath = path.join(baseDirectory, file.path);
    const directory = path.dirname(fullPath);

    // Create directory if it doesn't exist
    await fs.mkdir(directory, { recursive: true });

    // Check if file exists
    const fileExists = await this.fileExists(fullPath);

    if (fileExists) {
      // Read existing file content
      const existingContent = await fs.readFile(fullPath, 'utf-8');

      // Only write and count as updated if content actually changed
      if (existingContent !== file.content) {
        await fs.writeFile(fullPath, file.content, 'utf-8');
        result.filesUpdated++;
      }
    } else {
      // Create new file
      await fs.writeFile(fullPath, file.content, 'utf-8');
      result.filesCreated++;
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns true if the given file path is inside one of the incompatible skill
   * directories, including nested subdirectories (e.g. `scripts/`).
   */
  private isUnderIncompatibleSkillDir(
    filePath: string,
    incompatibleSkillDirs: Map<string, string>,
  ): boolean {
    return this.getSkillNameForPath(filePath, incompatibleSkillDirs) !== null;
  }

  /**
   * Returns the skill name for the given file path by finding the incompatible
   * skill directory that contains it (including nested subdirectories).
   */
  private getSkillNameForPath(
    filePath: string,
    incompatibleSkillDirs: Map<string, string>,
  ): string | null {
    for (const [dir, skillName] of incompatibleSkillDirs.entries()) {
      if (
        filePath === dir ||
        filePath.startsWith(dir + '/') ||
        filePath.startsWith(dir + path.sep)
      ) {
        return skillName;
      }
    }
    return null;
  }

  /**
   * Returns true if the skill's `metadata.packmind-cli-version` constraint
   * is present AND the given CLI version does NOT satisfy it (i.e. the skill
   * is meant for an older CLI version than the one running).
   */
  private isVersionConstraintViolated(
    content: string,
    cliVersion: string,
  ): boolean {
    const parsed = parseSkillMdContent(content);
    if (!parsed) return false;

    const metadata = parsed.properties['metadata'] as
      | Record<string, string>
      | undefined;
    if (!metadata) return false;

    const constraint = metadata['packmind-cli-version'];
    if (!constraint) return false;

    const normalizedVersion = stripPrerelease(cliVersion);
    return !semver.satisfies(normalizedVersion, constraint);
  }

  /** Extracts the `name` field from the skill frontmatter, or returns null. */
  private getSkillName(content: string): string | null {
    const parsed = parseSkillMdContent(content);
    if (!parsed) return null;
    const name = parsed.properties['name'];
    return typeof name === 'string' ? name : null;
  }
}
