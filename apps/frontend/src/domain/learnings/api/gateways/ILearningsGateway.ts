import {
  IAcceptKnowledgePatchUseCase,
  IGetKnowledgePatchUseCase,
  IGetTopicsStatsUseCase,
  IListKnowledgePatchesUseCase,
  IRejectKnowledgePatchUseCase,
  IDistillAllPendingTopicsUseCase,
  NewGateway,
} from '@packmind/types';

export interface ILearningsGateway {
  listKnowledgePatches: NewGateway<IListKnowledgePatchesUseCase>;
  getKnowledgePatch: NewGateway<IGetKnowledgePatchUseCase>;
  acceptKnowledgePatch: NewGateway<IAcceptKnowledgePatchUseCase>;
  rejectKnowledgePatch: NewGateway<IRejectKnowledgePatchUseCase>;
  distillAllPendingTopics: NewGateway<IDistillAllPendingTopicsUseCase>;
  getTopicsStats: NewGateway<IGetTopicsStatsUseCase>;
}
