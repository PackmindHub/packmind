import { ProgrammingLanguage, RuleId } from '@packmind/types';

export type FileToAnalyze = {
  sourceCode: string;
  language: ProgrammingLanguage;
  path: string;
};

export type FileWithApplicablePractices = {
  file: FileToAnalyze;
  ruleIds: RuleId[];
};
