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
  ISearchArtifactsBySemanticsUseCase,
  IGetEmbeddingHealthUseCase,
  ITriggerEmbeddingBackfillUseCase,
  IGetRagLabConfigurationUseCase,
  IUpdateRagLabConfigurationUseCase,
  ITriggerFullReembeddingUseCase,
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
  searchArtifactsBySemantics: NewGateway<ISearchArtifactsBySemanticsUseCase>;
  getEmbeddingHealth: NewGateway<IGetEmbeddingHealthUseCase>;
  triggerEmbeddingBackfill: NewGateway<ITriggerEmbeddingBackfillUseCase>;
  getRagLabConfiguration: NewGateway<IGetRagLabConfigurationUseCase>;
  updateRagLabConfiguration: NewGateway<IUpdateRagLabConfigurationUseCase>;
  triggerFullReembedding: NewGateway<ITriggerFullReembeddingUseCase>;
}
