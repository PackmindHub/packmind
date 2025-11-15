import {
  CaptureTopicCommand,
  CaptureTopicResponse,
} from '../contracts/CaptureTopicUseCase';

export const ILearningsPortName = 'ILearningsPort' as const;

/**
 * Port interface for the Learnings domain.
 * Defines all public methods that can be consumed by other domains.
 */
export interface ILearningsPort {
  captureTopic(command: CaptureTopicCommand): Promise<CaptureTopicResponse>;
}
