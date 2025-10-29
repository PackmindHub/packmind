import {
  ILintFilesInDirectory,
  LintFilesInDirectoryCommand,
  LintFilesInDirectoryResult,
} from '../../domain/useCases/ILintFilesInDirectory';
import { PackmindServices } from '../services/PackmindServices';
import { IPackmindRepositories } from '../../domain/repositories/IPackmindRepositories';
import { LintViolation } from '../../domain/entities/LintViolation';
import { minimatch } from 'minimatch';
import {
  ExecuteLinterProgramsCommand,
  LinterExecutionProgram,
  LinterExecutionViolation,
  PackmindLogger,
  ProgrammingLanguage,
  stringToProgrammingLanguage,
} from '@packmind/shared';

const origin = 'LintFilesInDirectoryUseCase';

export class LintFilesInDirectoryUseCase implements ILintFilesInDirectory {
  constructor(
    private readonly services: PackmindServices,
    private readonly repositories: IPackmindRepositories,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private fileMatchesScope(filePath: string, scopePatterns: string[]): boolean {
    // If no scope patterns defined, run on all files
    if (!scopePatterns || scopePatterns.length === 0) {
      return true;
    }

    // Check if file matches any of the scope patterns
    return scopePatterns.some((pattern) => minimatch(filePath, pattern));
  }

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
    command: LintFilesInDirectoryCommand,
  ): Promise<LintFilesInDirectoryResult> {
    const { path, draftMode, standardSlug, ruleId, language } = command;

    this.logger.debug(
      `Starting linting: path="${path}", draftMode=${!!draftMode}, standardSlug="${standardSlug || 'N/A'}", ruleId="${ruleId || 'N/A'}", language="${language || 'N/A'}"`,
    );

    // Step 0: Resolve git repository root
    const gitRepoRoot =
      await this.services.gitRemoteUrlService.getGitRepositoryRoot(path);

    // Step 1: List files in the directory excluding ignored folders
    const files = await this.services.listFiles.listFilesInDirectory(
      gitRepoRoot,
      [],
      ['node_modules', 'dist', '.min.', '.map.', '.git'],
    );

    // Step 2: Get Git remote URL
    const { gitRemoteUrl } =
      await this.services.gitRemoteUrlService.getGitRemoteUrl(gitRepoRoot);

    // Step 2.5: Get current branches
    const { branches } =
      await this.services.gitRemoteUrlService.getCurrentBranches(gitRepoRoot);

    this.logger.debug(
      `Git repository: url="${gitRemoteUrl}", branches=${JSON.stringify(branches)}, filesCount=${files.length}`,
    );

    // Step 3: Get detection programs from Packmind Gateway
    let detectionPrograms;
    let isDraftMode = false;

    if (draftMode && standardSlug && ruleId) {
      // Draft mode: Get draft detection programs for specific rule
      isDraftMode = true;
      const draftProgramsResult =
        await this.repositories.packmindGateway.getDraftDetectionProgramsForRule(
          {
            standardSlug,
            ruleId,
            language,
          },
        );

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
                scope: [], // No scope filtering in draft mode
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
    } else if (!draftMode && standardSlug && ruleId) {
      // Active mode: Get active detection programs for specific rule
      const activeProgramsResult =
        await this.repositories.packmindGateway.getActiveDetectionProgramsForRule(
          {
            standardSlug,
            ruleId,
            language,
          },
        );

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
                scope: [], // No scope filtering when targeting specific rule
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
    } else {
      // Normal mode: Get all active detection programs from git repo
      detectionPrograms =
        await this.repositories.packmindGateway.listExecutionPrograms({
          gitRemoteUrl,
          branches,
        });
    }

    this.logger.debug(
      `Retrieved detection programs: targetsCount=${detectionPrograms.targets.length}`,
    );

    // Step 4: Execute each program for each file and collect violations
    const violations: LintViolation[] = [];

    for (const file of files) {
      const fileViolations: LintViolation['violations'] = [];

      // Convert absolute file path to relative path from git repo root
      // This ensures proper matching against target paths and scopes
      const relativeFilePath = file.path.startsWith(gitRepoRoot)
        ? file.path.substring(gitRepoRoot.length)
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

          // Check if file matches target and scope (skip in draft mode)
          if (
            !isDraftMode &&
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
                  console.error(
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
                console.error(
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

    // Step 5: Format results with summary
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
      gitRemoteUrl,
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
