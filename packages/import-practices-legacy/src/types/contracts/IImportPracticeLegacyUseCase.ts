import { IUseCase, PackmindCommand } from '@packmind/types';
import { LegacyPracticeInput } from '../LegacyPractice';

/**
 * Command for importing legacy practices into Packmind standards.
 */
export type ImportPracticeLegacyCommand = PackmindCommand & {
  legacyData: LegacyPracticeInput;
};

/**
 * Represents a successfully imported standard.
 */
export interface ImportedStandard {
  name: string;
  slug: string;
}

/**
 * Represents a standard that was skipped during import.
 */
export interface SkippedStandard {
  name: string;
  reason: string;
}

/**
 * Response from the import legacy practices use case.
 */
export type ImportPracticeLegacyResponse = {
  importedStandards: ImportedStandard[];
  skippedStandards: SkippedStandard[];
};

/**
 * Use case interface for importing legacy practices.
 */
export type IImportPracticeLegacyUseCase = IUseCase<
  ImportPracticeLegacyCommand,
  ImportPracticeLegacyResponse
>;
