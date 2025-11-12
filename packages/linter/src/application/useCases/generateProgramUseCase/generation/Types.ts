import { SourceCodeState } from '@packmind/types';
import { RuleId } from '@packmind/types';
import { TokensUsed } from '@packmind/types';

export type AiAnswer = {
  answer: string | null;
  tokensUsed?: TokensUsed;
};

export type AiAnswerWithDetails = {
  answer: string;
  details: string;
  type?: DetectionMethodType;
};

export type DetectionTechniqueGenerated = {
  program?: string;
  programDescription?: string;
  success: boolean;
  sourceCodeState: SourceCodeState;
};

export enum DetectionMethodType {
  PROGRAM = 'PROGRAM',
}

export type AnalysisResult = {
  ruleId: RuleId;
  method: DetectionMethodType;
  filePath: string;
  positive: boolean;
  precision: number;
  recall: number;
  truePositives: LineViolation[];
  falsePositives: number[];
  falseNegatives: LineViolation[];
};

export type ProgramGenerationStatus = {
  program: string;
  programDescription: string;
  success: boolean;
  sourceCodeState: SourceCodeState;
};

export type ProgramGenerationResult = {
  program: string;
  results: AnalysisResult[];
  sourceCodeState: SourceCodeState;
};

export type FileWithViolations = {
  path: string;
  violations: RuleViolation[];
};

export type PracticeViolationWithLineNumbersForBatch = {
  path: string;
  violations: RuleViolationWithLineNumbers[];
};

export type RuleViolationWithLineNumbers = {
  rule: RuleId;
  lines: number[];
};

export type RuleViolation = {
  rule: RuleId;
  lines: LineViolation[];
};

export type LineViolation = {
  start: number;
  end: number;
};
