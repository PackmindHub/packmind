import { RuleId } from '@packmind/types';
import { DetectionHeuristics } from '../entities/DetectionHeuristics';

export interface IRuleDetectionHeuristicsRepository {
  upsertHeuristics(heuristic: DetectionHeuristics): Promise<void>;

  getHeuristicsForRule(ruleId: RuleId): Promise<DetectionHeuristics | null>;
}
