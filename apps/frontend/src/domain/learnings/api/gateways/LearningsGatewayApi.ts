import {
  AcceptKnowledgePatchCommand,
  AcceptKnowledgePatchResponse,
  DistillAllPendingTopicsCommand,
  DistillAllPendingTopicsResponse,
  DistillTopicCommand,
  DistillTopicResponse,
  GetKnowledgePatchCommand,
  GetKnowledgePatchResponse,
  GetTopicByIdCommand,
  GetTopicByIdResponse,
  GetTopicsStatsCommand,
  GetTopicsStatsResponse,
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
  ListKnowledgePatchesCommand,
  ListKnowledgePatchesResponse,
  ListTopicsCommand,
  ListTopicsResponse,
  SearchArtifactsBySemanticsCommand,
  SearchArtifactsBySemanticsResponse,
  GetEmbeddingHealthCommand,
  GetEmbeddingHealthResponse,
  TriggerEmbeddingBackfillCommand,
  TriggerEmbeddingBackfillResponse,
  GetRagLabConfigurationCommand,
  GetRagLabConfigurationResult,
  UpdateRagLabConfigurationCommand,
  RagLabConfiguration,
  TriggerFullReembeddingCommand,
  TriggerFullReembeddingResponse,
  NewGateway,
  NewPackmindCommandBody,
  RejectKnowledgePatchCommand,
  RejectKnowledgePatchResponse,
  SpaceId,
} from '@packmind/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { ILearningsGateway } from './ILearningsGateway';

export class LearningsGatewayApi
  extends PackmindGateway
  implements ILearningsGateway
{
  constructor() {
    super('/learnings');
  }

  listKnowledgePatches: NewGateway<IListKnowledgePatchesUseCase> = async ({
    spaceId,
    organizationId,
    status,
  }: NewPackmindCommandBody<ListKnowledgePatchesCommand>) => {
    const queryParams = status ? `?status=${status}` : '';
    return this._api.get<ListKnowledgePatchesResponse>(
      `/organizations/${organizationId}/spaces/${spaceId}/learnings/patches${queryParams}`,
    );
  };

  getKnowledgePatch: NewGateway<IGetKnowledgePatchUseCase> = async ({
    patchId,
    organizationId,
    spaceId,
  }: NewPackmindCommandBody<GetKnowledgePatchCommand>) => {
    return this._api.get<GetKnowledgePatchResponse>(
      `/organizations/${organizationId}/spaces/${spaceId}/learnings/patches/${patchId}`,
    );
  };

  acceptKnowledgePatch: NewGateway<IAcceptKnowledgePatchUseCase> = async ({
    patchId,
    organizationId,
    spaceId,
    reviewNotes,
  }: NewPackmindCommandBody<AcceptKnowledgePatchCommand>) => {
    return this._api.post<AcceptKnowledgePatchResponse>(
      `/organizations/${organizationId}/spaces/${spaceId}/learnings/patches/${patchId}/accept`,
      { reviewNotes },
    );
  };

  rejectKnowledgePatch: NewGateway<IRejectKnowledgePatchUseCase> = async ({
    patchId,
    organizationId,
    spaceId,
    reviewNotes,
  }: NewPackmindCommandBody<RejectKnowledgePatchCommand>) => {
    return this._api.post<RejectKnowledgePatchResponse>(
      `/organizations/${organizationId}/spaces/${spaceId}/learnings/patches/${patchId}/reject`,
      { reviewNotes },
    );
  };

  distillAllPendingTopics: NewGateway<IDistillAllPendingTopicsUseCase> =
    async ({
      organizationId,
      spaceId,
    }: NewPackmindCommandBody<DistillAllPendingTopicsCommand>) => {
      return this._api.post<DistillAllPendingTopicsResponse>(
        `/organizations/${organizationId}/spaces/${spaceId}/learnings/distill-all`,
        {},
      );
    };

  distillTopic: NewGateway<IDistillTopicUseCase> = async (
    command: NewPackmindCommandBody<DistillTopicCommand> & {
      spaceId?: SpaceId;
    },
  ) => {
    const { organizationId, topicId, spaceId } = command;
    return this._api.post<DistillTopicResponse>(
      `/organizations/${organizationId}/spaces/${spaceId}/learnings/topics/${topicId}/distill`,
      {},
    );
  };

  getTopicsStats: NewGateway<IGetTopicsStatsUseCase> = async ({
    organizationId,
    spaceId,
  }: NewPackmindCommandBody<GetTopicsStatsCommand>) => {
    return this._api.get<GetTopicsStatsResponse>(
      `/organizations/${organizationId}/spaces/${spaceId}/learnings/topics/stats`,
    );
  };

  listTopics: NewGateway<IListTopicsUseCase> = async ({
    organizationId,
    spaceId,
  }: NewPackmindCommandBody<ListTopicsCommand>) => {
    return this._api.get<ListTopicsResponse>(
      `/organizations/${organizationId}/spaces/${spaceId}/learnings/topics`,
    );
  };

  getTopicById: NewGateway<IGetTopicByIdUseCase> = async ({
    organizationId,
    spaceId,
    topicId,
  }: NewPackmindCommandBody<GetTopicByIdCommand>) => {
    return this._api.get<GetTopicByIdResponse>(
      `/organizations/${organizationId}/spaces/${spaceId}/learnings/topics/${topicId}`,
    );
  };

  searchArtifactsBySemantics: NewGateway<ISearchArtifactsBySemanticsUseCase> =
    async ({
      organizationId,
      spaceId,
      queryText,
      threshold,
      maxResults,
      resultTypes,
    }: NewPackmindCommandBody<SearchArtifactsBySemanticsCommand>) => {
      const queryParams = new URLSearchParams();
      queryParams.append('queryText', queryText);
      if (threshold !== undefined) {
        queryParams.append('threshold', threshold.toString());
      }
      if (maxResults !== undefined) {
        queryParams.append('maxResults', maxResults.toString());
      }
      if (resultTypes !== undefined) {
        queryParams.append('resultTypes', resultTypes);
      }

      return this._api.get<SearchArtifactsBySemanticsResponse>(
        `/organizations/${organizationId}/spaces/${spaceId}/learnings/rag-lab/search?${queryParams}`,
      );
    };

  getEmbeddingHealth: NewGateway<IGetEmbeddingHealthUseCase> = async ({
    organizationId,
    spaceId,
  }: NewPackmindCommandBody<GetEmbeddingHealthCommand>) => {
    return this._api.get<GetEmbeddingHealthResponse>(
      `/organizations/${organizationId}/spaces/${spaceId}/learnings/rag-lab/health`,
    );
  };

  triggerEmbeddingBackfill: NewGateway<ITriggerEmbeddingBackfillUseCase> =
    async ({
      organizationId,
      spaceId,
    }: NewPackmindCommandBody<TriggerEmbeddingBackfillCommand>) => {
      return this._api.post<TriggerEmbeddingBackfillResponse>(
        `/organizations/${organizationId}/spaces/${spaceId}/learnings/rag-lab/backfill`,
        {},
      );
    };

  getRagLabConfiguration: NewGateway<IGetRagLabConfigurationUseCase> = async ({
    organizationId,
  }: NewPackmindCommandBody<GetRagLabConfigurationCommand>) => {
    return this._api.get<GetRagLabConfigurationResult>(
      `/organizations/${organizationId}/rag-lab/configuration`,
    );
  };

  updateRagLabConfiguration: NewGateway<IUpdateRagLabConfigurationUseCase> =
    async ({
      organizationId,
      embeddingModel,
      embeddingDimensions,
      includeCodeBlocks,
      maxTextLength,
    }: NewPackmindCommandBody<UpdateRagLabConfigurationCommand>) => {
      return this._api.put<RagLabConfiguration>(
        `/organizations/${organizationId}/rag-lab/configuration`,
        {
          embeddingModel,
          embeddingDimensions,
          includeCodeBlocks,
          maxTextLength,
        },
      );
    };

  triggerFullReembedding: NewGateway<ITriggerFullReembeddingUseCase> = async ({
    organizationId,
  }: NewPackmindCommandBody<TriggerFullReembeddingCommand>) => {
    return this._api.post<TriggerFullReembeddingResponse>(
      `/organizations/${organizationId}/rag-lab/trigger-full-reembedding`,
      {},
    );
  };
}
