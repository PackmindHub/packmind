import { PackmindCommand } from '../../UseCase';
import { ProgrammingLanguage } from '../../languages';
import { RuleId } from '../../standards';
import { DetectionHeuristics } from '../DetectionHeuristics';

export type GetDetectionHeuristicsCommand = PackmindCommand & {
  ruleId: RuleId;
  language: ProgrammingLanguage;
};

export type GetDetectionHeuristicsResponse = {
  detectionHeuristics: DetectionHeuristics | null;
};

export interface IGetDetectionHeuristics {
  execute(
    command: GetDetectionHeuristicsCommand,
  ): Promise<GetDetectionHeuristicsResponse>;
}
