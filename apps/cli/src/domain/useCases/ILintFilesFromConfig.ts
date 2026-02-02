import { IPublicUseCase } from '@packmind/types';
import { LintViolation } from '../entities/LintViolation';
import { DiffMode } from '../entities/DiffMode';

export type LintFilesFromConfigCommand = {
  path: string;
  diffMode?: DiffMode;
};

export type LintFilesFromConfigResult = {
  violations: LintViolation[];
  summary: {
    totalFiles: number;
    violatedFiles: number;
    totalViolations: number;
    standardsChecked: string[];
  };
};

export type ILintFilesFromConfig = IPublicUseCase<
  LintFilesFromConfigCommand,
  LintFilesFromConfigResult
>;
