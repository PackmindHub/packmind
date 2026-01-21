import { PackmindCommand } from '../../UseCase';
import {
  DetectionHeuristics,
  DetectionHeuristicsId,
} from '../DetectionHeuristics';

export type UpdateRuleDetectionHeuristicsCommand = PackmindCommand & {
  detectionHeuristicsId: DetectionHeuristicsId;
  heuristics: string[];
  clarificationQuestion?: {
    question: string;
    answer: string;
  };
  /**
   * When true, skips triggering rule detection assessment after heuristics update.
   * Use when called from program generation to prevent resetting assessment status.
   */
  skipAssessmentTrigger?: boolean;
};

export type UpdateRuleDetectionHeuristicsResponse = {
  detectionHeuristics: DetectionHeuristics;
};

export interface IUpdateRuleDetectionHeuristics {
  execute(
    command: UpdateRuleDetectionHeuristicsCommand,
  ): Promise<UpdateRuleDetectionHeuristicsResponse>;
}
