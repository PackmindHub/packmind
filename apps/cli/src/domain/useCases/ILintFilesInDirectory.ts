import { IPublicUseCase, RuleId } from '@packmind/types';
import { LintViolation } from '../entities/LintViolation';
import { DiffMode } from '../entities/DiffMode';

export type LintFilesInDirectoryCommand = {
  path: string;
  draftMode?: boolean;
  standardSlug?: string;
  ruleId?: RuleId;
  language?: string;
  diffMode?: DiffMode;
};

export type LintFilesInDirectoryResult = {
  gitRemoteUrl: string;
  violations: LintViolation[];
  summary: {
    totalFiles: number;
    violatedFiles: number;
    totalViolations: number;
    standardsChecked: string[];
  };
};

export type ILintFilesInDirectory = IPublicUseCase<
  LintFilesInDirectoryCommand,
  LintFilesInDirectoryResult
>;
