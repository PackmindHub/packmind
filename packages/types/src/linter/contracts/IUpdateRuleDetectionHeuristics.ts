import { PackmindCommand } from '../../UseCase';
import {
  DetectionHeuristics,
  DetectionHeuristicsId,
} from '../DetectionHeuristics';

export type UpdateRuleDetectionHeuristicsCommand = PackmindCommand & {
  detectionHeuristicsId: DetectionHeuristicsId;
  heuristics: string;
};

export type UpdateRuleDetectionHeuristicsResponse = {
  detectionHeuristics: DetectionHeuristics;
};

export interface IUpdateRuleDetectionHeuristics {
  execute(
    command: UpdateRuleDetectionHeuristicsCommand,
  ): Promise<UpdateRuleDetectionHeuristicsResponse>;
}
