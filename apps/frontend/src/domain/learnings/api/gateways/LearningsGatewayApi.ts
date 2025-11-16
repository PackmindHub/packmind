import {
  AcceptKnowledgePatchCommand,
  AcceptKnowledgePatchResponse,
  DistillAllPendingTopicsCommand,
  DistillAllPendingTopicsResponse,
  GetKnowledgePatchCommand,
  GetKnowledgePatchResponse,
  GetTopicByIdCommand,
  GetTopicByIdResponse,
  GetTopicsStatsCommand,
  GetTopicsStatsResponse,
  IAcceptKnowledgePatchUseCase,
  IDistillAllPendingTopicsUseCase,
  IGetKnowledgePatchUseCase,
  IGetTopicByIdUseCase,
  IGetTopicsStatsUseCase,
  IListKnowledgePatchesUseCase,
  IListTopicsUseCase,
  IRejectKnowledgePatchUseCase,
  ListKnowledgePatchesCommand,
  ListKnowledgePatchesResponse,
  ListTopicsCommand,
  ListTopicsResponse,
  NewGateway,
  NewPackmindCommandBody,
  RejectKnowledgePatchCommand,
  RejectKnowledgePatchResponse,
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
}
