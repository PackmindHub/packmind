import { IPublicUseCase, RuleId } from '@packmind/types';
import { LintViolation } from '../entities/LintViolation';
import { DiffMode } from '../entities/DiffMode';

export type LintFilesAgainstRuleCommand = {
  path: string;
  standardSlug: string;
  ruleId: RuleId;
  draftMode?: boolean;
  language?: string;
  diffMode?: DiffMode;
  ignorePatterns?: string[];
};

export type LintFilesAgainstRuleResult = {
  violations: LintViolation[];
  summary: {
    totalFiles: number;
    violatedFiles: number;
    totalViolations: number;
    standardsChecked: string[];
    ignoredFile?: { filePath: string; matchedPattern: string };
  };
};

export type ILintFilesAgainstRule = IPublicUseCase<
  LintFilesAgainstRuleCommand,
  LintFilesAgainstRuleResult
>;
