import {
  ILintFilesLocally,
  LintFilesLocallyCommand,
  LintFilesLocallyResult,
} from '../../domain/useCases/ILintFilesLocally';
import { PackmindServices } from '../services/PackmindServices';
import { IPackmindRepositories } from '../../domain/repositories/IPackmindRepositories';
import { LintViolation } from '../../domain/entities/LintViolation';
import { minimatch } from 'minimatch';
import { PackmindLogger } from '@packmind/logger';
import {
  ExecuteLinterProgramsCommand,
  LinterExecutionProgram,
  LinterExecutionViolation,
} from '@packmind/types';
import {
  ProgrammingLanguage,
  stringToProgrammingLanguage,
} from '@packmind/types';
import * as path from 'path';
import * as fs from 'fs/promises';

const origin = 'LintFilesLocallyUseCase';

export class LintFilesLocallyUseCase implements ILintFilesLocally {
  constructor(
    private readonly services: PackmindServices,
    private readonly repositories: IPackmindRepositories,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private fileMatchesTargetAndScope(
    filePath: string,
    targetPath: string,
    scopePatterns: string[],
  ): boolean {
    if (!scopePatterns || scopePatterns.length === 0) {
      const effectivePattern = this.buildEffectivePattern(targetPath, null);
      return minimatch(filePath, effectivePattern, { matchBase: false });
    }

    return scopePatterns.some((scopePattern) => {
      const effectivePattern = this.buildEffectivePattern(
        targetPath,
        scopePattern,
      );
      return minimatch(filePath, effectivePattern, { matchBase: false });
    });
  }

  private buildEffectivePattern(
    targetPath: string,
    scope: string | null,
  ): string {
    const normalizedTarget =
      targetPath === '/' ? '/' : targetPath.replace(/\/$/, '');

    if (!scope) {
      return normalizedTarget === '/' ? '/**' : normalizedTarget + '/**';
    }

    if (
      scope.startsWith(normalizedTarget + '/') ||
      scope === normalizedTarget
    ) {
      return scope.endsWith('/') ? scope + '**' : scope;
    }

    const cleanScope = scope.startsWith('/') ? scope.substring(1) : scope;

    let pattern: string;
    if (normalizedTarget === '/') {
      pattern = '/' + cleanScope;
    } else {
      pattern = normalizedTarget + '/' + cleanScope;
    }

    if (pattern.endsWith('/')) {
      pattern = pattern + '**';
    }

    return pattern;
  }

  public async execute(
    command: LintFilesLocallyCommand,
  ): Promise<LintFilesLocallyResult> {
    const { path: userPath } = command;

    this.logger.debug(`Starting local linting: path="${userPath}"`);

    const absoluteUserPath = path.isAbsolute(userPath)
      ? userPath
      : path.resolve(process.cwd(), userPath);

    let pathStats;
    try {
      pathStats = await fs.stat(absoluteUserPath);
    } catch {
      throw new Error(
        `The path "${absoluteUserPath}" does not exist or cannot be accessed`,
      );
    }

    const isFile = pathStats.isFile();
    const directoryForConfig = isFile
      ? path.dirname(absoluteUserPath)
      : absoluteUserPath;

    // Try to get git root (may be null if outside git repo)
    const gitRepoRoot =
      await this.services.gitRemoteUrlService.tryGetGitRepositoryRoot(
        directoryForConfig,
      );

    // Use git root as stop boundary, or null to walk to filesystem root
    const hierarchicalConfig =
      await this.repositories.configFileRepository.readHierarchicalConfig(
        directoryForConfig,
        gitRepoRoot,
      );

    if (!hierarchicalConfig.hasConfigs) {
      const boundary = gitRepoRoot ?? 'filesystem root';
      throw new Error(
        `No packmind.json found between ${directoryForConfig} and ${boundary}. Cannot use local linting.`,
      );
    }

    // Use git root as base for relative paths, or the config directory if outside git
    const basePath = gitRepoRoot ?? directoryForConfig;

    this.logger.debug(
      `Found ${hierarchicalConfig.configPaths.length} packmind.json file(s)`,
    );
    for (const configPath of hierarchicalConfig.configPaths) {
      this.logger.debug(`Using config: ${configPath}`);
    }

    const packageSlugs = Object.keys(hierarchicalConfig.packages);
    this.logger.debug(
      `Merged ${packageSlugs.length} packages from configuration files`,
    );

    const detectionPrograms =
      await this.repositories.packmindGateway.getDetectionProgramsForPackages({
        packagesSlugs: packageSlugs,
      });

    this.logger.debug(
      `Retrieved detection programs: targetsCount=${detectionPrograms.targets.length}`,
    );

    const files = isFile
      ? [{ path: absoluteUserPath }]
      : await this.services.listFiles.listFilesInDirectory(
          absoluteUserPath,
          [],
          ['node_modules', 'dist', '.min.', '.map.', '.git'],
        );

    this.logger.debug(`Found ${files.length} files to lint`);

    const violations: LintViolation[] = [];

    for (const file of files) {
      const fileViolations: LintViolation['violations'] = [];

      const relativeFilePath = file.path.startsWith(basePath)
        ? file.path.substring(basePath.length)
        : file.path;

      const normalizedFilePath = relativeFilePath.startsWith('/')
        ? relativeFilePath
        : '/' + relativeFilePath;

      this.logger.debug(
        `Processing file: absolute="${file.path}", relative="${normalizedFilePath}"`,
      );

      const fileExtension = this.extractExtensionFromFile(file.path);
      const fileLanguage = this.resolveProgrammingLanguage(fileExtension);

      if (!fileLanguage) {
        continue;
      }

      const programsByLanguage = new Map<
        ProgrammingLanguage,
        LinterExecutionProgram[]
      >();

      for (const target of detectionPrograms.targets) {
        for (const standard of target.standards) {
          if (
            !this.fileMatchesTargetAndScope(
              normalizedFilePath,
              target.path,
              standard.scope,
            )
          ) {
            continue;
          }

          for (const rule of standard.rules) {
            for (const activeProgram of rule.activeDetectionPrograms) {
              try {
                const programLanguage = this.resolveProgrammingLanguage(
                  activeProgram.language,
                );

                if (!programLanguage || programLanguage !== fileLanguage) {
                  continue;
                }

                const programsForLanguage =
                  programsByLanguage.get(programLanguage) ?? [];

                programsForLanguage.push({
                  code: activeProgram.detectionProgram.code,
                  ruleContent: rule.content,
                  standardSlug: standard.slug,
                  sourceCodeState:
                    activeProgram.detectionProgram.sourceCodeState,
                  language: fileLanguage,
                });

                programsByLanguage.set(programLanguage, programsForLanguage);
              } catch (error) {
                console.error(
                  `Error preparing program for file ${file.path}: ${error}`,
                );
              }
            }
          }
        }
      }

      if (programsByLanguage.size > 0) {
        try {
          const fileContent = await this.services.listFiles.readFileContent(
            file.path,
          );

          for (const [language, programs] of programsByLanguage.entries()) {
            try {
              const result = await this.executeProgramsForFile({
                filePath: file.path,
                fileContent,
                language,
                programs,
              });

              fileViolations.push(...result);
            } catch (error) {
              console.error(
                `Error executing programs for file ${file.path} (${language}): ${error}`,
              );
            }
          }
        } catch (error) {
          console.error(
            `Error reading file content for ${file.path}: ${error}`,
          );
        }
      }

      if (fileViolations.length > 0) {
        violations.push({
          file: file.path,
          violations: fileViolations,
        });
      }
    }

    const totalViolations = violations.reduce(
      (sum, violation) => sum + violation.violations.length,
      0,
    );

    const standardsChecked: string[] = Array.from(
      new Set(
        detectionPrograms.targets.flatMap((target) =>
          target.standards.map((standard) => standard.slug),
        ),
      ),
    );

    return {
      violations,
      summary: {
        totalFiles: files.length,
        violatedFiles: violations.length,
        totalViolations,
        standardsChecked,
      },
    };
  }

  private resolveProgrammingLanguage(
    language: string,
  ): ProgrammingLanguage | null {
    try {
      return stringToProgrammingLanguage(language);
    } catch {
      return null;
    }
  }

  private async executeProgramsForFile(
    command: ExecuteLinterProgramsCommand,
  ): Promise<LinterExecutionViolation[]> {
    const result = await this.services.linterExecutionUseCase.execute(command);
    return result.violations;
  }

  public extractExtensionFromFile(filePath: string): string {
    const lastDotIndex = filePath.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === filePath.length - 1) {
      return '';
    }
    return filePath.substring(lastDotIndex + 1);
  }
}
