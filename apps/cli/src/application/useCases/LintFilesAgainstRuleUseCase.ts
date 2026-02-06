import {
  ILintFilesAgainstRule,
  LintFilesAgainstRuleCommand,
  LintFilesAgainstRuleResult,
} from '../../domain/useCases/ILintFilesAgainstRule';
import { IPackmindRepositories } from '../../domain/repositories/IPackmindRepositories';
import { LintViolation } from '../../domain/entities/LintViolation';
import { DiffMode, ModifiedLine } from '../../domain/entities/DiffMode';
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
import { pathStartsWith } from '../utils/pathUtils';
import { logErrorConsole } from '../../infra/utils/consoleLogger';
import { handleScope } from '../utils/handleScope';
import { IPackmindServices } from '../../domain/services/IPackmindServices';

const origin = 'LintFilesAgainstRuleUseCase';

export class LintFilesAgainstRuleUseCase implements ILintFilesAgainstRule {
  constructor(
    private readonly services: IPackmindServices,
    private readonly repositories: IPackmindRepositories,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public fileMatchesTargetAndScope(
    filePath: string,
    targetPath: string,
    scopePatterns: string[],
  ): boolean {
    // File path is expected to already be normalized (relative to git root, starting with '/')

    // If no scope patterns, check if file is within target path
    if (!scopePatterns || scopePatterns.length === 0) {
      const effectivePattern = this.buildEffectivePattern(targetPath, null);
      const matches = minimatch(filePath, effectivePattern, {
        matchBase: false,
      });

      this.logger.debug(
        `File matching check: file="${filePath}", target="${targetPath}", scope=null, pattern="${effectivePattern}", matches=${matches}`,
      );

      return matches;
    }

    // Check if file matches ANY of the scope patterns
    const matches = scopePatterns.some((scopePattern) => {
      const effectivePattern = this.buildEffectivePattern(
        targetPath,
        scopePattern,
      );
      const patternMatches = minimatch(filePath, effectivePattern, {
        matchBase: false,
      });

      this.logger.debug(
        `File matching check: file="${filePath}", target="${targetPath}", scope="${scopePattern}", pattern="${effectivePattern}", matches=${patternMatches}`,
      );

      return patternMatches;
    });

    return matches;
  }

  private buildEffectivePattern(
    targetPath: string,
    scope: string | null,
  ): string {
    // Normalize target path (remove trailing slash unless it's root)
    const normalizedTarget =
      targetPath === '/' ? '/' : targetPath.replace(/\/$/, '');

    // If no scope, just use target path with wildcard
    if (!scope) {
      return normalizedTarget === '/' ? '/**' : normalizedTarget + '/**';
    }

    // Check if scope starts with target path (Example 7)
    // The scope must start with the normalized target path
    if (
      scope.startsWith(normalizedTarget + '/') ||
      scope === normalizedTarget
    ) {
      // Use scope alone, ensure it has wildcard if it's a directory
      return scope.endsWith('/') ? scope + '**' : scope;
    }

    // Strip leading "/" from scope if present (Examples 6, 8, 9)
    const cleanScope = scope.startsWith('/') ? scope.substring(1) : scope;

    // Concatenate target path and scope
    let pattern: string;
    if (normalizedTarget === '/') {
      // Root target - prepend slash to scope
      pattern = '/' + cleanScope;
    } else {
      // Non-root target - concatenate with slash
      pattern = normalizedTarget + '/' + cleanScope;
    }

    // If pattern ends with '/', add wildcard to match everything inside
    if (pattern.endsWith('/')) {
      pattern = pattern + '**';
    }

    return pattern;
  }

  public async execute(
    command: LintFilesAgainstRuleCommand,
  ): Promise<LintFilesAgainstRuleResult> {
    const {
      path: userPath,
      draftMode,
      standardSlug,
      ruleId,
      language,
      diffMode,
    } = command;

    this.logger.debug(
      `Starting linting: path="${userPath}", draftMode=${!!draftMode}, standardSlug="${standardSlug || 'N/A'}", ruleId="${ruleId || 'N/A'}", language="${language || 'N/A'}", diffMode="${diffMode ?? 'none'}"`,
    );

    // Step 0: Resolve git repository root and absolute path to lint
    // Convert the user-provided path to an absolute path first
    const absoluteUserPath = path.isAbsolute(userPath)
      ? userPath
      : path.resolve(process.cwd(), userPath);

    // Check if the path is a file or directory
    let pathStats;
    try {
      pathStats = await fs.stat(absoluteUserPath);
    } catch {
      throw new Error(
        `The path "${absoluteUserPath}" does not exist or cannot be accessed`,
      );
    }

    const isFile = pathStats.isFile();

    // If it's a file, use its directory for Git operations
    const directoryForGitOps = isFile
      ? path.dirname(absoluteUserPath)
      : absoluteUserPath;

    this.logger.debug(
      `Path type: ${isFile ? 'file' : 'directory'}, gitOpsDir="${directoryForGitOps}"`,
    );

    // Try to get git repository root, but don't require it
    const gitRepoRoot =
      this.services.gitRemoteUrlService.tryGetGitRepositoryRoot(
        directoryForGitOps,
      );

    // Use git root if available, otherwise use the lint path directory as root
    const effectiveRoot = gitRepoRoot ?? directoryForGitOps;
    const absoluteLintPath = absoluteUserPath;

    this.logger.debug(
      `Resolved paths: effectiveRoot="${effectiveRoot}", lintPath="${absoluteLintPath}", inGitRepo=${!!gitRepoRoot}`,
    );

    // Get diff information if diffMode is enabled
    let modifiedFiles: string[] | null = null;
    let modifiedLines: ModifiedLine[] | null = null;

    if (diffMode) {
      // Diff mode requires being in a git repository
      if (!gitRepoRoot) {
        throw new Error(
          'The --changed-files and --changed-lines options require the project to be in a Git repository',
        );
      }

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

    // Step 1: List files - if single file, use it directly; otherwise scan directory
    let files = isFile
      ? [{ path: absoluteLintPath }]
      : await this.services.listFiles.listFilesInDirectory(
          absoluteLintPath,
          [],
          ['node_modules', 'dist', '.min.', '.map.', '.git'],
        );

    // Filter files by modified files if diffMode is set
    if (modifiedFiles) {
      const modifiedFilesSet = new Set(modifiedFiles);
      files = files.filter((file) => modifiedFilesSet.has(file.path));
      this.logger.debug(`Filtered to ${files.length} modified files`);
    }

    // Step 3: Get detection programs from Packmind Gateway
    let detectionPrograms;
    let isDraftMode = false;

    if (draftMode) {
      // Draft mode: Get draft detection programs for specific rule
      isDraftMode = true;
      const draftProgramsResult =
        await this.repositories.packmindGateway.linter.getDraftDetectionProgramsForRule(
          {
            standardSlug,
            ruleId,
            language,
          },
        );
      if (draftProgramsResult.programs.length === 0) {
        const languageMsg = language ? ` for language ${language}` : '';
        throw new Error(
          `No draft detection programs found for rule ${ruleId} in standard ${standardSlug}${languageMsg}`,
        );
      }

      // Transform draft programs into the same format as active programs
      detectionPrograms = {
        targets: [
          {
            name: 'Draft Target',
            path: '/',
            standards: [
              {
                name: standardSlug,
                slug: standardSlug,
                scope: handleScope(draftProgramsResult.scope),
                rules: [
                  {
                    content: draftProgramsResult.ruleContent || 'Draft Rule',
                    activeDetectionPrograms: draftProgramsResult.programs.map(
                      (program) => ({
                        language: program.language,
                        detectionProgram: {
                          mode: program.mode,
                          code: program.code,
                          sourceCodeState: program.sourceCodeState,
                        },
                      }),
                    ),
                  },
                ],
              },
            ],
          },
        ],
      };
    } else {
      // Active mode: Get active detection programs for specific rule
      const activeProgramsResult =
        await this.repositories.packmindGateway.linter.getActiveDetectionProgramsForRule(
          {
            standardSlug,
            ruleId,
            language,
          },
        );
      if (activeProgramsResult.programs.length === 0) {
        const languageMsg = language ? ` for language ${language}` : '';
        throw new Error(
          `No active detection programs found for rule ${ruleId} in standard ${standardSlug}${languageMsg}`,
        );
      }
      // Transform active programs into the same format
      detectionPrograms = {
        targets: [
          {
            name: 'Active Target',
            path: '/',
            standards: [
              {
                name: standardSlug,
                slug: standardSlug,
                scope: handleScope(activeProgramsResult.scope),
                rules: [
                  {
                    content: activeProgramsResult.ruleContent || 'Active Rule',
                    activeDetectionPrograms: activeProgramsResult.programs.map(
                      (program) => ({
                        language: program.language,
                        detectionProgram: {
                          mode: program.mode,
                          code: program.code,
                          sourceCodeState: program.sourceCodeState,
                        },
                      }),
                    ),
                  },
                ],
              },
            ],
          },
        ],
      };
    }

    this.logger.debug(
      `Retrieved detection programs: targetsCount=${detectionPrograms.targets.length}`,
    );

    this.repositories.packmindGateway.linter
      .trackLinterExecution({
        targetCount: 1,
        standardCount: 1,
      })
      .catch(() => {
        // Not a problem if tracking failed
      });

    // Step 4: Execute each program for each file and collect violations
    const violations: LintViolation[] = [];

    for (const file of files) {
      const fileViolations: LintViolation['violations'] = [];

      // Convert absolute file path to relative path from effective root
      // This ensures proper matching against target paths and scopes
      const relativeFilePath = pathStartsWith(file.path, effectiveRoot)
        ? file.path.substring(effectiveRoot.length)
        : file.path;

      // Ensure the relative path starts with '/'
      const normalizedFilePath = relativeFilePath.startsWith('/')
        ? relativeFilePath
        : '/' + relativeFilePath;

      this.logger.debug(
        `Processing file: absolute="${file.path}", relative="${normalizedFilePath}"`,
      );

      // Determine file language from extension
      const fileExtension = this.extractExtensionFromFile(file.path);
      const fileLanguage = this.resolveProgrammingLanguage(fileExtension);

      // Skip files with unknown language
      if (!fileLanguage) {
        continue;
      }

      const programsByLanguage = new Map<
        ProgrammingLanguage,
        LinterExecutionProgram[]
      >();

      // Iterate over targets and their standards
      for (const target of detectionPrograms.targets) {
        this.logger.debug(
          `Processing target: name="${target.name}", path="${target.path}", standardsCount=${target.standards.length}`,
        );

        for (const standard of target.standards) {
          this.logger.debug(
            `Checking standard: name="${standard.name}", scope=${JSON.stringify(standard.scope)}, rulesCount=${standard.rules.length}`,
          );

          // Check if file matches target and scope
          if (
            !this.fileMatchesTargetAndScope(
              normalizedFilePath,
              target.path,
              standard.scope,
            )
          ) {
            this.logger.debug(
              `File "${normalizedFilePath}" does not match target/scope - skipping standard "${standard.name}"`,
            );
            continue; // Skip this standard if file doesn't match
          }

          if (!isDraftMode) {
            this.logger.debug(
              `File "${normalizedFilePath}" matches target/scope - processing standard "${standard.name}"`,
            );
          }

          for (const rule of standard.rules) {
            for (const activeProgram of rule.activeDetectionPrograms) {
              try {
                const programLanguage = this.resolveProgrammingLanguage(
                  activeProgram.language,
                );

                if (!programLanguage) {
                  logErrorConsole(
                    `Unsupported language "${activeProgram.language}" for file ${file.path}`,
                  );
                  continue;
                }

                // Only add programs that match the file's language
                if (programLanguage !== fileLanguage) {
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
                // Log error but continue with other programs
                logErrorConsole(
                  `Error preparing program for file ${file.path}: ${error}`,
                );
              }
            }
          }
        }
      }

      // Only load file content if there are programs to execute
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
              logErrorConsole(
                `Error executing programs for file ${file.path} (${language}): ${error}`,
              );
            }
          }
        } catch (error) {
          logErrorConsole(
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

    // Step 5: Filter violations by lines if diffMode is LINES
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

    // Step 6: Format results with summary
    const totalViolations = filteredViolations.reduce(
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
      violations: filteredViolations,
      summary: {
        totalFiles: files.length,
        violatedFiles: filteredViolations.length,
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
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
