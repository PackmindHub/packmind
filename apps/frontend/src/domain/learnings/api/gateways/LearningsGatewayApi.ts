import {
  AcceptKnowledgePatchCommand,
  AcceptKnowledgePatchResponse,
  GetKnowledgePatchCommand,
  GetKnowledgePatchResponse,
  IAcceptKnowledgePatchUseCase,
  IGetKnowledgePatchUseCase,
  IListKnowledgePatchesUseCase,
  IRejectKnowledgePatchUseCase,
  ListKnowledgePatchesCommand,
  ListKnowledgePatchesResponse,
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
}
