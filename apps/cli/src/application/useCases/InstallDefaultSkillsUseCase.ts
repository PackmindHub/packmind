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

export class InstallDefaultSkillsUseCase implements IInstallDefaultSkillsUseCase {
  constructor(private readonly repositories: IPackmindRepositories) {}

  public async execute(
    command: IInstallDefaultSkillsCommand,
  ): Promise<IInstallDefaultSkillsResult> {
    const baseDirectory = command.baseDirectory || process.cwd();

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
              incompatibleSkillDirs.has(path.dirname(file.path)));

          if (isIncompatible) {
            const skillName =
              this.getSkillName(file.content) ??
              incompatibleSkillDirs.get(path.dirname(file.path)) ??
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

    return result;
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

    const normalizedVersion = cliVersion.replace('-next', '');
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
