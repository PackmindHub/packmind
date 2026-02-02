import { IPublicUseCase } from '../../UseCase';
import { ProgrammingLanguage } from '../../languages';
import { SourceCodeState } from '../DetectionProgram';

export type LinterExecutionProgram = {
  standardSlug: string;
  ruleContent: string;
  code: string;
  sourceCodeState: SourceCodeState;
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
