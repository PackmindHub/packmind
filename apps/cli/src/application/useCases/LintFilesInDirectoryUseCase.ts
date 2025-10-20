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
  ProgrammingLanguage,
  stringToProgrammingLanguage,
} from '@packmind/shared';

export class LintFilesInDirectoryUseCase implements ILintFilesInDirectory {
  constructor(
    private readonly services: PackmindServices,
    private readonly repositories: IPackmindRepositories,
  ) {}

  private fileMatchesScope(filePath: string, scopePatterns: string[]): boolean {
    // If no scope patterns defined, run on all files
    if (!scopePatterns || scopePatterns.length === 0) {
      return true;
    }

    // Check if file matches any of the scope patterns
    return scopePatterns.some((pattern) => minimatch(filePath, pattern));
  }

  public async execute(
    command: LintFilesInDirectoryCommand,
  ): Promise<LintFilesInDirectoryResult> {
    const { path } = command;

    // Step 1: List files in the directory excluding ignored folders
    const files = await this.services.listFiles.listFilesInDirectory(
      path,
      [],
      ['node_modules', 'dist', '.min.', '.map.', '.git'],
    );

    // Step 2: Get Git remote URL
    const { gitRemoteUrl } =
      await this.services.gitRemoteUrlService.getGitRemoteUrl(path);

    // Step 3: Get detection programs from Packmind Gateway
    const detectionPrograms =
      await this.repositories.packmindGateway.listExecutionPrograms({
        gitRemoteUrl,
      });

    // Step 4: Execute each program for each file and collect violations
    const violations: LintViolation[] = [];

    for (const file of files) {
      const fileViolations: LintViolation['violations'] = [];
      const programsByLanguage = new Map<
        ProgrammingLanguage,
        LinterExecutionProgram[]
      >();

      for (const standard of detectionPrograms.standards) {
        // Check if this file matches the standard's scope
        if (!this.fileMatchesScope(file.path, standard.scope)) {
          continue; // Skip this standard if file doesn't match scope
        }

        const fileExtension = this.extractExtensionFromFile(file.path);
        const fileLanguage = this.resolveProgrammingLanguage(fileExtension);

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

              const programsForLanguage =
                programsByLanguage.get(programLanguage) ?? [];

              programsForLanguage.push({
                code: activeProgram.detectionProgram.code,
                ruleContent: rule.content,
                standardSlug: standard.slug,
                sourceCodeState: activeProgram.detectionProgram.sourceCodeState,
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

      for (const [language, programs] of programsByLanguage.entries()) {
        try {
          const result = await this.executeProgramsForFile({
            filePath: file.path,
            fileContent: file.content,
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

    const standardsChecked = Array.from(
      new Set(detectionPrograms.standards.map((standard) => standard.slug)),
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
    } catch (error) {
      console.error(`Unsupported programming language "${language}": ${error}`);
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
