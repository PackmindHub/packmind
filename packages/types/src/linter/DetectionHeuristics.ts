import { Branded, brandedIdFactory } from '../brandedTypes';
import { ProgrammingLanguage } from '../languages';
import { RuleId } from '../standards';

export type DetectionHeuristicsId = Branded<'DetectionHeuristicsId'>;
export const createDetectionHeuristicsId =
  brandedIdFactory<DetectionHeuristicsId>();

export enum RuleFeasibility {
  SINGLE_FILE_AST = 'single_file_ast',
  UNDETECTABLE = 'undetectable',
  PENDING = 'pending',
}

export type AssessmentDetectionReadiness = {
  feasible: boolean;
  reason: string[];
};

export type DetectionHeuristics = {
  id: DetectionHeuristicsId;
  ruleId: RuleId;
  language: ProgrammingLanguage;
  heuristics: string;
};
