import { IPublicUseCase } from '@packmind/types';
import { LintViolation } from '../entities/LintViolation';
import { DiffMode } from '../entities/DiffMode';

export type LintFilesLocallyCommand = {
  path: string;
  diffMode?: DiffMode;
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
