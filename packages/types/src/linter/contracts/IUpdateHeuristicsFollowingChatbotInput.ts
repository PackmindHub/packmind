import { PackmindCommand } from '../../UseCase';
import { DetectionHeuristicsId } from '../DetectionHeuristics';

export type UpdateHeuristicsFollowingChatbotInputCommand = PackmindCommand & {
  detectionHeuristicsId: DetectionHeuristicsId;
  question: string;
  answer: string;
};

export type UpdateHeuristicsFollowingChatbotInputResponse = {
  newHeuristic: string;
};

export interface IUpdateHeuristicsFollowingChatbotInput {
  execute(
    command: UpdateHeuristicsFollowingChatbotInputCommand,
  ): Promise<UpdateHeuristicsFollowingChatbotInputResponse>;
}
