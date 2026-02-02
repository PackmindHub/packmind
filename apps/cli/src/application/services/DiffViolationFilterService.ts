import { LintViolation } from '../../domain/entities/LintViolation';
import { ModifiedLine } from '../../domain/entities/DiffMode';
import { IDiffViolationFilterService } from '../../domain/services/IDiffViolationFilterService';

export class DiffViolationFilterService implements IDiffViolationFilterService {
  /**
   * Filters violations to only include those in modified files.
   * @param violations - The list of violations to filter
   * @param modifiedFiles - The list of absolute paths of modified files
   * @returns Violations that occur in modified files
   */
  filterByFiles(
    violations: LintViolation[],
    modifiedFiles: string[],
  ): LintViolation[] {
    const modifiedFilesSet = new Set(modifiedFiles);

    return violations.filter((violation) =>
      modifiedFilesSet.has(violation.file),
    );
  }

  /**
   * Filters violations to only include those on modified lines.
   * @param violations - The list of violations to filter
   * @param modifiedLines - The list of modified line ranges
   * @returns Violations that occur on modified lines
   */
  filterByLines(
    violations: LintViolation[],
    modifiedLines: ModifiedLine[],
  ): LintViolation[] {
    // Group modified lines by file for efficient lookup
    const modifiedLinesByFile = this.groupModifiedLinesByFile(modifiedLines);

    return violations
      .map((violation) => {
        const fileModifications = modifiedLinesByFile.get(violation.file);
        if (!fileModifications) {
          return null;
        }

        const filteredViolations = violation.violations.filter(
          (singleViolation) =>
            this.isLineInModifiedRanges(
              singleViolation.line,
              fileModifications,
            ),
        );

        if (filteredViolations.length === 0) {
          return null;
        }

        return {
          file: violation.file,
          violations: filteredViolations,
        };
      })
      .filter((v): v is LintViolation => v !== null);
  }

  /**
   * Groups modified lines by file path for efficient lookup.
   */
  private groupModifiedLinesByFile(
    modifiedLines: ModifiedLine[],
  ): Map<string, ModifiedLine[]> {
    const byFile = new Map<string, ModifiedLine[]>();

    for (const modification of modifiedLines) {
      const existing = byFile.get(modification.file) ?? [];
      existing.push(modification);
      byFile.set(modification.file, existing);
    }

    return byFile;
  }

  /**
   * Checks if a line number falls within any of the modified line ranges.
   */
  private isLineInModifiedRanges(
    line: number,
    modifications: ModifiedLine[],
  ): boolean {
    return modifications.some((mod) => {
      const endLine = mod.startLine + mod.lineCount - 1;
      return line >= mod.startLine && line <= endLine;
    });
  }
}
