import {
  IAcceptKnowledgePatchUseCase,
  IDistillAllPendingTopicsUseCase,
  IDistillTopicUseCase,
  IGetKnowledgePatchUseCase,
  IGetTopicByIdUseCase,
  IGetTopicsStatsUseCase,
  IListKnowledgePatchesUseCase,
  IListTopicsUseCase,
  IRejectKnowledgePatchUseCase,
  NewGateway,
} from '@packmind/types';

export interface ILearningsGateway {
  listKnowledgePatches: NewGateway<IListKnowledgePatchesUseCase>;
  getKnowledgePatch: NewGateway<IGetKnowledgePatchUseCase>;
  acceptKnowledgePatch: NewGateway<IAcceptKnowledgePatchUseCase>;
  rejectKnowledgePatch: NewGateway<IRejectKnowledgePatchUseCase>;
  distillAllPendingTopics: NewGateway<IDistillAllPendingTopicsUseCase>;
  distillTopic: NewGateway<IDistillTopicUseCase>;
  getTopicsStats: NewGateway<IGetTopicsStatsUseCase>;
  listTopics: NewGateway<IListTopicsUseCase>;
  getTopicById: NewGateway<IGetTopicByIdUseCase>;
}
