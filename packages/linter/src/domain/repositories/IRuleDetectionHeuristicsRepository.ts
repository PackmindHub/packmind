import {
  RuleId,
  DetectionHeuristics,
  ProgrammingLanguage,
  DetectionHeuristicsId,
} from '@packmind/types';

export interface IRuleDetectionHeuristicsRepository {
  upsertHeuristics(heuristic: DetectionHeuristics): Promise<void>;

  getHeuristicsForRule(
    ruleId: RuleId,
    language: ProgrammingLanguage,
  ): Promise<DetectionHeuristics | null>;

  getAllHeuristicsForRule(ruleId: RuleId): Promise<DetectionHeuristics[]>;

  updateHeuristics(
    id: DetectionHeuristicsId,
    heuristics: string[],
  ): Promise<void>;

  getHeuristicsById(
    id: DetectionHeuristicsId,
  ): Promise<DetectionHeuristics | null>;

  softDeleteByRuleId(ruleId: RuleId): Promise<void>;
}
