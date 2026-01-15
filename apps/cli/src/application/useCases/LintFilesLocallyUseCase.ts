import {
  ILintFilesLocally,
  LintFilesLocallyCommand,
  LintFilesLocallyResult,
} from '../../domain/useCases/ILintFilesLocally';
import { PackmindServices } from '../services/PackmindServices';
import { IPackmindRepositories } from '../../domain/repositories/IPackmindRepositories';
import { LintViolation } from '../../domain/entities/LintViolation';
import { DiffMode, ModifiedLine } from '../../domain/entities/DiffMode';
import { minimatch } from 'minimatch';
import { PackmindLogger } from '@packmind/logger';
import {
  ConfigWithTarget,
  ExecuteLinterProgramsCommand,
  LinterExecutionProgram,
  LinterExecutionViolation,
} from '@packmind/types';
import { GetDetectionProgramsForPackagesResult } from '../../domain/repositories/IPackmindGateway';
import {
  ProgrammingLanguage,
  stringToProgrammingLanguage,
} from '@packmind/types';
import * as path from 'path';
import * as fs from 'fs/promises';
import { pathStartsWith } from '../utils/pathUtils';

const origin = 'LintFilesLocallyUseCase';

export class LintFilesLocallyUseCase implements ILintFilesLocally {
  private detectionProgramsCache: Map<
    string,
    GetDetectionProgramsForPackagesResult
  > = new Map();

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
    const { path: userPath, diffMode } = command;

    this.logger.debug(
      `Starting local linting: path="${userPath}", diffMode="${diffMode ?? 'none'}"`,
    );

    // Clear cache at the start of each execution
    this.detectionProgramsCache.clear();

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

    // Get diff information if diffMode is enabled
    let modifiedFiles: string[] | null = null;
    let modifiedLines: ModifiedLine[] | null = null;

    if (diffMode && gitRepoRoot) {
      if (diffMode === DiffMode.FILES) {
        modifiedFiles =
          await this.services.gitRemoteUrlService.getModifiedFiles(gitRepoRoot);
        this.logger.debug(`Found ${modifiedFiles.length} modified files`);

        // If no files are modified, return early with no violations
        if (modifiedFiles.length === 0) {
          return {
            violations: [],
            summary: {
              totalFiles: 0,
              violatedFiles: 0,
              totalViolations: 0,
              standardsChecked: [],
            },
          };
        }
      } else if (diffMode === DiffMode.LINES) {
        modifiedLines =
          await this.services.gitRemoteUrlService.getModifiedLines(gitRepoRoot);
        // Also get modified files to pre-filter
        modifiedFiles = [...new Set(modifiedLines.map((ml) => ml.file))];
        this.logger.debug(
          `Found ${modifiedLines.length} modified line ranges in ${modifiedFiles.length} files`,
        );

        // If no files are modified, return early with no violations
        if (modifiedFiles.length === 0) {
          return {
            violations: [],
            summary: {
              totalFiles: 0,
              violatedFiles: 0,
              totalViolations: 0,
              standardsChecked: [],
            },
          };
        }
      }
    }

    // Find all configs in tree (ancestors and descendants)
    const allConfigs =
      await this.repositories.configFileRepository.findAllConfigsInTree(
        directoryForConfig,
        gitRepoRoot,
      );

    if (!allConfigs.hasConfigs) {
      const boundary = gitRepoRoot ?? 'filesystem root';
      throw new Error(
        `No packmind.json found between ${directoryForConfig} and ${boundary}. Cannot use local linting.`,
      );
    }

    const basePath = allConfigs.basePath;

    this.logger.debug(
      `Found ${allConfigs.configs.length} packmind.json file(s)`,
    );
    for (const config of allConfigs.configs) {
      this.logger.debug(
        `Using config: ${config.absoluteTargetPath}/packmind.json (target: ${config.targetPath})`,
      );
    }

    let files = isFile
      ? [{ path: absoluteUserPath }]
      : await this.services.listFiles.listFilesInDirectory(
          absoluteUserPath,
          [],
          ['node_modules', 'dist', '.min.', '.map.', '.git'],
        );

    // Filter files by modified files if diffMode is set
    if (modifiedFiles) {
      const modifiedFilesSet = new Set(modifiedFiles);
      files = files.filter((file) => modifiedFilesSet.has(file.path));
      this.logger.debug(`Filtered to ${files.length} modified files`);
    }

    this.logger.debug(`Found ${files.length} files to lint`);

    const violations: LintViolation[] = [];
    const allStandardsChecked = new Set<string>();

    for (const file of files) {
      const fileViolations: LintViolation['violations'] = [];

      const relativeFilePath = pathStartsWith(file.path, basePath)
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

      // Find all matching targets (configs whose directory is an ancestor of the file)
      const matchingTargets = this.findMatchingTargets(
        file.path,
        allConfigs.configs,
      );

      const programsByLanguage = new Map<
        ProgrammingLanguage,
        LinterExecutionProgram[]
      >();

      // Accumulate programs from all matching targets
      for (const targetConfig of matchingTargets) {
        const detectionPrograms =
          await this.getDetectionProgramsForTarget(targetConfig);

        for (const target of detectionPrograms.targets) {
          for (const standard of target.standards) {
            // Apply scope filtering within the target
            if (
              !this.fileMatchesTargetAndScope(
                normalizedFilePath,
                targetConfig.targetPath,
                standard.scope,
              )
            ) {
              continue;
            }

            allStandardsChecked.add(standard.slug);

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

    // Filter violations by lines if diffMode is LINES
    let filteredViolations = violations;
    if (diffMode === DiffMode.LINES && modifiedLines) {
      filteredViolations =
        this.services.diffViolationFilterService.filterByLines(
          violations,
          modifiedLines,
        );
      this.logger.debug(
        `Filtered violations by lines: ${violations.length} -> ${filteredViolations.length}`,
      );
    }

    const totalViolations = filteredViolations.reduce(
      (sum, violation) => sum + violation.violations.length,
      0,
    );

    return {
      violations: filteredViolations,
      summary: {
        totalFiles: files.length,
        violatedFiles: filteredViolations.length,
        totalViolations,
        standardsChecked: Array.from(allStandardsChecked),
      },
    };
  }

  /**
   * Finds all targets (configs) that are ancestors of the given file path.
   * A target matches if the file is located within or under the target's directory.
   */
  private findMatchingTargets(
    absoluteFilePath: string,
    configs: ConfigWithTarget[],
  ): ConfigWithTarget[] {
    return configs.filter((config) =>
      pathStartsWith(absoluteFilePath, config.absoluteTargetPath),
    );
  }

  /**
   * Gets detection programs for a target, using cache to avoid redundant API calls.
   * Cache key is the sorted package slugs to handle identical package sets.
   */
  private async getDetectionProgramsForTarget(
    targetConfig: ConfigWithTarget,
  ): Promise<GetDetectionProgramsForPackagesResult> {
    const packageSlugs = Object.keys(targetConfig.packages).sort((a, b) =>
      a.localeCompare(b),
    );
    const cacheKey = packageSlugs.join(',');

    const cached = this.detectionProgramsCache.get(cacheKey);
    if (cached) {
      this.logger.debug(
        `Using cached detection programs for packages: ${cacheKey}`,
      );
      return cached;
    }

    this.logger.debug(
      `Fetching detection programs for packages: ${packageSlugs.join(', ')}`,
    );

    const detectionPrograms =
      await this.repositories.packmindGateway.getDetectionProgramsForPackages({
        packagesSlugs: packageSlugs,
      });

    this.detectionProgramsCache.set(cacheKey, detectionPrograms);

    return detectionPrograms;
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
