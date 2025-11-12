import { PackmindCommand } from '../../UseCase';
import { ProgrammingLanguage } from '../../languages';
import { RuleId } from '../../standards';
import { DetectionHeuristics } from '../DetectionHeuristics';

export type CreateDetectionHeuristicsCommand = PackmindCommand & {
  ruleId: RuleId;
  language: ProgrammingLanguage;
};

export type CreateDetectionHeuristicsResponse = {
  detectionHeuristics: DetectionHeuristics;
};

export interface ICreateDetectionHeuristics {
  execute(
    command: CreateDetectionHeuristicsCommand,
  ): Promise<CreateDetectionHeuristicsResponse>;
}
