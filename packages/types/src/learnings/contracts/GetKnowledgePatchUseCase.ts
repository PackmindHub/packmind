import { IUseCase, PackmindCommand } from '../../UseCase';
import { KnowledgePatch } from '../KnowledgePatch';
import { KnowledgePatchId } from '../KnowledgePatchId';

export type GetKnowledgePatchCommand = PackmindCommand & {
  patchId: KnowledgePatchId;
};

export type GetKnowledgePatchResponse = {
  patch: KnowledgePatch;
};

export type IGetKnowledgePatchUseCase = IUseCase<
  GetKnowledgePatchCommand,
  GetKnowledgePatchResponse
>;
