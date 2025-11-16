import { IUseCase, PackmindCommand } from '../../UseCase';
import { KnowledgePatch } from '../KnowledgePatch';
import { KnowledgePatchId } from '../KnowledgePatchId';

export type RejectKnowledgePatchCommand = PackmindCommand & {
  patchId: KnowledgePatchId;
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
