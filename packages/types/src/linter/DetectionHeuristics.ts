import { Branded, brandedIdFactory } from '../brandedTypes';
import { ProgrammingLanguage } from '../languages';
import { RuleId } from '../standards';

export type DetectionHeuristicsId = Branded<'DetectionHeuristicsId'>;
export const createDetectionHeuristicsId =
  brandedIdFactory<DetectionHeuristicsId>();

export type AssessmentDetectionReadiness = {
  feasible: boolean;
  reason: string[];
  clarificationQuestion?: {
    question: string;
    answers: string[];
  };
};

export type DetectionHeuristics = {
  id: DetectionHeuristicsId;
  ruleId: RuleId;
  language: ProgrammingLanguage;
  heuristics: string[];
};
