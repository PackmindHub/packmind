import {
  IAcceptKnowledgePatchUseCase,
  IDistillAllPendingTopicsUseCase,
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
  getTopicsStats: NewGateway<IGetTopicsStatsUseCase>;
  listTopics: NewGateway<IListTopicsUseCase>;
  getTopicById: NewGateway<IGetTopicByIdUseCase>;
}
