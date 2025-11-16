import {
  CaptureTopicCommand,
  CaptureTopicResponse,
} from '../contracts/CaptureTopicUseCase';
import {
  DistillTopicCommand,
  DistillTopicResponse,
} from '../contracts/DistillTopicUseCase';
import {
  DistillAllPendingTopicsCommand,
  DistillAllPendingTopicsResponse,
} from '../contracts/DistillAllPendingTopicsUseCase';
import {
  GetTopicsStatsCommand,
  GetTopicsStatsResponse,
} from '../contracts/GetTopicsStatsUseCase';
import {
  ListTopicsCommand,
  ListTopicsResponse,
} from '../contracts/ListTopicsUseCase';
import {
  GetTopicByIdCommand,
  GetTopicByIdResponse,
} from '../contracts/GetTopicByIdUseCase';
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
  distillAllPendingTopics(
    command: DistillAllPendingTopicsCommand,
  ): Promise<DistillAllPendingTopicsResponse>;
  getTopicsStats(
    command: GetTopicsStatsCommand,
  ): Promise<GetTopicsStatsResponse>;
  listTopics(command: ListTopicsCommand): Promise<ListTopicsResponse>;
  getTopicById(command: GetTopicByIdCommand): Promise<GetTopicByIdResponse>;
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
