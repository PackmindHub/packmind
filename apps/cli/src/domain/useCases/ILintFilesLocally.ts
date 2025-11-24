import { IPublicUseCase } from '@packmind/types';
import { LintViolation } from '../entities/LintViolation';

export type LintFilesLocallyCommand = {
  path: string;
};

export type LintFilesLocallyResult = {
  violations: LintViolation[];
  summary: {
    totalFiles: number;
    violatedFiles: number;
    totalViolations: number;
    standardsChecked: string[];
  };
};

export type ILintFilesLocally = IPublicUseCase<
  LintFilesLocallyCommand,
  LintFilesLocallyResult
>;
