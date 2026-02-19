import {
  DetectionSeverity,
  DetectionStatus,
  RuleId,
  Branded,
  ProgrammingLanguage,
  TokensUsed,
} from '@packmind/types';

export { LinterHexa } from './LinterHexa';
export { LinterModule } from './nest-api/linter.module';
export { LinterUsecases } from './LinterUsecases';
export { LinterAdapter } from './LinterAdapter';
export * from './GenerateProgramCommand';

export const linterSchemas: [] = [];

export type ActiveDetectionProgramId = Branded<'ActiveDetectionProgramId'>;
export type ActiveDetectionProgram = {
  id: ActiveDetectionProgramId;
  detectionProgramVersion: DetectionProgramId | null;
  ruleId: RuleId;
  language: ProgrammingLanguage;
  detectionProgramDraftVersion: DetectionProgramId | null;
  severity: DetectionSeverity;
};

export type LanguageDetectionPrograms = ActiveDetectionProgram & {
  detectionProgram: DetectionProgram | null;
  draftDetectionProgram: DetectionProgram | null;
  isExampleOnly?: boolean;
};

export type DetectionProgramId = Branded<'DetectionProgramId'>;
export enum DetectionModeEnum {
  REGEXP = 'regexp',
  SINGLE_AST = 'singleAst',
  FILE_SYSTEM = 'fileSystem',
}
export type SourceCodeState = 'AST' | 'RAW' | 'NONE';

export type DetectionProgram = {
  id: DetectionProgramId;
  code: string;
  version: number;
  mode: DetectionModeEnum;
  ruleId: RuleId;
  language: ProgrammingLanguage;
  status: DetectionStatus;
  sourceCodeState: SourceCodeState;
  createdAt?: Date;
};

export type DetectionProgramMetadata = {
  id: string;
  detectionProgramId: DetectionProgramId;
  taskId: string;
  tokens: TokensUsed | null;
  logs: ExecutionLog[] | null;
  programDescription: string;
  detectionHeuristics: string;
};

export type ExecutionLog = {
  timestamp: number;
  message: string;
  metadata?: ExecutionLogMetadata;
};

export type ExecutionLogMetadata = Record<string, string>;

export type RuleDetectionAssessmentId = Branded<'RuleDetectionAssessmentId'>;

export enum RuleDetectionAssessmentStatus {
  NOT_STARTED = 'NOT_STARTED',
  SUCCESS = 'SUCCEEDED',
  FAILED = 'FAILED',
}

export type RuleDetectionAssessment = {
  id: RuleDetectionAssessmentId;
  ruleId: RuleId;
  language: ProgrammingLanguage;
  detectionMode: DetectionModeEnum;
  status: RuleDetectionAssessmentStatus;
  details: string;
};
