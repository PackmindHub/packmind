import { IPublicUseCase, RuleId } from '@packmind/shared';
import { LintViolation } from '../entities/LintViolation';

export type LintFilesInDirectoryCommand = {
  path: string;
  draftMode?: boolean;
  standardSlug?: string;
  ruleId?: RuleId;
  language?: string;
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
