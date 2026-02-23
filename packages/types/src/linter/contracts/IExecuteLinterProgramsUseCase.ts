import { IPublicUseCase } from '../../UseCase';
import { ProgrammingLanguage } from '../../languages';
import { DetectionSeverity } from '../ActiveDetectionProgram';
import { SourceCodeState } from '../DetectionProgram';

export type LinterExecutionProgram = {
  standardSlug: string;
  ruleContent: string;
  code: string;
  sourceCodeState: SourceCodeState;
  language: ProgrammingLanguage;
  severity: DetectionSeverity;
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
  severity: DetectionSeverity;
};

export type ExecuteLinterProgramsResult = {
  file: string;
  violations: LinterExecutionViolation[];
};

export type IExecuteLinterProgramsUseCase = IPublicUseCase<
  ExecuteLinterProgramsCommand,
  ExecuteLinterProgramsResult
>;
