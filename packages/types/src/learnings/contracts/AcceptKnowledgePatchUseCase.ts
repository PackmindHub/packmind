import { IUseCase, PackmindCommand } from '../../UseCase';
import { KnowledgePatch } from '../KnowledgePatch';
import { KnowledgePatchId } from '../KnowledgePatchId';
import { SpaceId } from '../../spaces/SpaceId';

export type AcceptKnowledgePatchCommand = PackmindCommand & {
  patchId: KnowledgePatchId;
  spaceId: SpaceId;
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
