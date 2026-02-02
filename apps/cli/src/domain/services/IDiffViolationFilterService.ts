import { LintViolation } from '../entities/LintViolation';
import { ModifiedLine } from '../entities/DiffMode';

export interface IDiffViolationFilterService {
  /**
   * Filters violations to only include those in modified files.
   * @param violations - The list of violations to filter
   * @param modifiedFiles - The list of absolute paths of modified files
   * @returns Violations that occur in modified files
   */
  filterByFiles(
    violations: LintViolation[],
    modifiedFiles: string[],
  ): LintViolation[];

  /**
   * Filters violations to only include those on modified lines.
   * @param violations - The list of violations to filter
   * @param modifiedLines - The list of modified line ranges
   * @returns Violations that occur on modified lines
   */
  filterByLines(
    violations: LintViolation[],
    modifiedLines: ModifiedLine[],
  ): LintViolation[];
}
