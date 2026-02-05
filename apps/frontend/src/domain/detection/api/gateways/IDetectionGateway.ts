import {
  ActiveDetectionProgram,
  DetectionProgram,
  DetectionProgramMetadata,
  LanguageDetectionPrograms,
  RuleDetectionAssessment,
  DetectionHeuristics,
} from '@packmind/types';
import {
  RuleLanguageDetectionStatus,
  RuleDetectionStatusSummary,
} from '@packmind/types';

export interface IDetectionGateway {
  saveDetectionProgram(
    standardId: string,
    ruleId: string,
    code: string,
  ): Promise<void>;

  updateDetectionProgram(
    standardId: string,
    ruleId: string,
    detectionProgramId: string,
    code: string,
  ): Promise<void>;

  getActiveDetectionPrograms(
    standardId: string,
    ruleId: string,
  ): Promise<LanguageDetectionPrograms[]>;

  getAllDetectionPrograms(
    standardId: string,
    ruleId: string,
  ): Promise<DetectionProgram[]>;

  generateProgram(
    standardId: string,
    ruleId: string,
    language?: string,
  ): Promise<void>;

  getDetectionProgramMetadata(
    standardId: string,
    ruleId: string,
    detectionProgramId: string,
  ): Promise<DetectionProgramMetadata | null>;

  activateDetectionProgram(
    standardId: string,
    ruleId: string,
    activeDetectionProgramId: string,
    detectionProgramId: string,
  ): Promise<ActiveDetectionProgram>;

  getRuleDetectionAssessment(
    standardId: string,
    ruleId: string,
    language: string,
  ): Promise<RuleDetectionAssessment | null>;

  getRuleLanguageDetectionStatus(
    standardId: string,
    ruleId: string,
    language: string,
  ): Promise<{ status: RuleLanguageDetectionStatus }>;

  getStandardRulesDetectionStatus(
    standardId: string,
  ): Promise<RuleDetectionStatusSummary[]>;

  testProgramExecution(
    standardId: string,
    ruleId: string,
    detectionProgramId: string,
    sandboxCode: string,
  ): Promise<
    { line: number; character: number; rule: string; standard: string }[]
  >;

  getDetectionHeuristics(
    standardId: string,
    ruleId: string,
    language: string,
  ): Promise<DetectionHeuristics | null>;

  updateDetectionHeuristics(
    standardId: string,
    ruleId: string,
    detectionHeuristicsId: string,
    heuristics: string[],
    clarificationQuestion?: {
      question: string;
      answer: string;
    },
  ): Promise<DetectionHeuristics>;

  startRuleDetectionAssessment(
    standardId: string,
    ruleId: string,
    language: string,
  ): Promise<RuleDetectionAssessment>;
}
