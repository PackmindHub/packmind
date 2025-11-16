import { IUseCase, PackmindCommand } from '../../UseCase';
import { KnowledgePatch } from '../KnowledgePatch';
import { KnowledgePatchId } from '../KnowledgePatchId';
import { SpaceId } from '../../spaces/SpaceId';

export type RejectKnowledgePatchCommand = PackmindCommand & {
  patchId: KnowledgePatchId;
  spaceId: SpaceId;
  reviewedBy: string;
  reviewNotes: string;
};

export type RejectKnowledgePatchResponse = {
  patch: KnowledgePatch;
};

export type IRejectKnowledgePatchUseCase = IUseCase<
  RejectKnowledgePatchCommand,
  RejectKnowledgePatchResponse
>;
