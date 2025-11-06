import { IPublicUseCase } from '@packmind/types';
import { ProgrammingLanguage } from '../../languages';

export type LinterExecutionProgram = {
  standardSlug: string;
  ruleContent: string;
  code: string;
  sourceCodeState: 'AST' | 'RAW';
  language: ProgrammingLanguage;
};

export type ExecuteLinterProgramsCommand = {
  filePath: string;
  fileContent: string;
  language: ProgrammingLanguage;
  programs: LinterExecutionProgram[];
};

export type LinterExecutionViolation = {
  line: number;
  character: number;
  rule: string;
  standard: string;
};

export type ExecuteLinterProgramsResult = {
  file: string;
  violations: LinterExecutionViolation[];
};

export type IExecuteLinterProgramsUseCase = IPublicUseCase<
  ExecuteLinterProgramsCommand,
  ExecuteLinterProgramsResult
>;
