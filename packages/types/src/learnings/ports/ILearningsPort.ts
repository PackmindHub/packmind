import {
  CaptureTopicCommand,
  CaptureTopicResponse,
} from '../contracts/CaptureTopicUseCase';
import {
  DistillTopicCommand,
  DistillTopicResponse,
} from '../contracts/DistillTopicUseCase';
import {
  ListKnowledgePatchesCommand,
  ListKnowledgePatchesResponse,
} from '../contracts/ListKnowledgePatchesUseCase';
import {
  GetKnowledgePatchCommand,
  GetKnowledgePatchResponse,
} from '../contracts/GetKnowledgePatchUseCase';
import {
  AcceptKnowledgePatchCommand,
  AcceptKnowledgePatchResponse,
} from '../contracts/AcceptKnowledgePatchUseCase';
import {
  RejectKnowledgePatchCommand,
  RejectKnowledgePatchResponse,
} from '../contracts/RejectKnowledgePatchUseCase';

export const ILearningsPortName = 'ILearningsPort' as const;

/**
 * Port interface for the Learnings domain.
 * Defines all public methods that can be consumed by other domains.
 */
export interface ILearningsPort {
  captureTopic(command: CaptureTopicCommand): Promise<CaptureTopicResponse>;
  distillTopic(command: DistillTopicCommand): Promise<DistillTopicResponse>;
  listKnowledgePatches(
    command: ListKnowledgePatchesCommand,
  ): Promise<ListKnowledgePatchesResponse>;
  getKnowledgePatch(
    command: GetKnowledgePatchCommand,
  ): Promise<GetKnowledgePatchResponse>;
  acceptKnowledgePatch(
    command: AcceptKnowledgePatchCommand,
  ): Promise<AcceptKnowledgePatchResponse>;
  rejectKnowledgePatch(
    command: RejectKnowledgePatchCommand,
  ): Promise<RejectKnowledgePatchResponse>;
}
