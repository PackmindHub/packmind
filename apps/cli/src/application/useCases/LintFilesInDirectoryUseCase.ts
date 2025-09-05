import {
  ILintFilesInDirectory,
  LintFilesInDirectoryCommand,
  LintFilesInDirectoryResult,
} from '../../domain/useCases/ILintFilesInDirectory';
import { PackmindServices } from '../services/PackmindServices';
import { IPackmindRepositories } from '../../domain/repositories/IPackmindRepositories';
import { LintViolation } from '../../domain/entities/LintViolation';
import { minimatch } from 'minimatch';

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

    // Step 1: List TypeScript files in the directory (hardcoded extensions and excludes)
    const files = await this.services.listFiles.listFilesInDirectory(
      path,
      ['.ts'],
      ['node_modules', 'dist'],
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

      for (const standard of detectionPrograms.standards) {
        // Check if this file matches the standard's scope
        if (!this.fileMatchesScope(file.path, standard.scope)) {
          continue; // Skip this standard if file doesn't match scope
        }

        for (const rule of standard.rules) {
          for (const activeProgram of rule.activeDetectionPrograms) {
            try {
              const results =
                await this.services.astExecutorService.executeProgram(
                  activeProgram.detectionProgram.code,
                  file.content,
                );

              // Convert results to violations with rule and standard information
              // Extract filename from rule content if it's a path
              const ruleName = rule.content.includes('/')
                ? rule.content.split('/').pop()?.replace('.js', '') ||
                  rule.content
                : rule.content;

              const ruleViolations = results.map((result) => ({
                line: result.line,
                character: result.character,
                rule: ruleName,
                standard: standard.slug,
              }));

              fileViolations.push(...ruleViolations);
            } catch (error) {
              // Log error but continue with other programs
              console.error(
                `Error executing program for file ${file.path}: ${error}`,
              );
            }
          }
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
}
