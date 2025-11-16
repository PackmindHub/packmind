import { IUseCase, PackmindCommand } from '../../UseCase';
import { KnowledgePatch } from '../KnowledgePatch';
import { KnowledgePatchId } from '../KnowledgePatchId';

export type AcceptKnowledgePatchCommand = PackmindCommand & {
  patchId: KnowledgePatchId;
  reviewedBy: string;
  reviewNotes?: string;
};

export type AcceptKnowledgePatchResponse = {
  patch: KnowledgePatch;
  applied: boolean;
};

export type IAcceptKnowledgePatchUseCase = IUseCase<
  AcceptKnowledgePatchCommand,
  AcceptKnowledgePatchResponse
>;
