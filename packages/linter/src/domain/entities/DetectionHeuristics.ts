import { RuleId } from '@packmind/types';

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
  _id?: string;
  ruleId: RuleId;
  heuristics: string;
  history: DetectionHeuristicHistory[];
};

export type DetectionHeuristicHistory = {
  question: string;
  answerPossibilities: string[];
  selectedAnswers: string[];
};
