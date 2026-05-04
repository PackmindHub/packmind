import {
  ImportPracticeLegacyCommand,
  ImportPracticeLegacyResponse,
} from '../contracts/IImportPracticeLegacyUseCase';

/**
 * Port interface for cross-domain access to Import Practices Legacy functionality.
 * Following DDD monorepo architecture standard.
 */
export const IImportPracticeLegacyPortName =
  'IImportPracticeLegacyPort' as const;

export interface IImportPracticeLegacyPort {
  /**
   * Import legacy practices into Packmind standards.
   * @param command - Command containing legacy data and user context
   * @returns Summary of imported and skipped standards
   */
  importPracticeLegacy(
    command: ImportPracticeLegacyCommand,
  ): Promise<ImportPracticeLegacyResponse>;
}
