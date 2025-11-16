import { IUseCase, PackmindCommand } from '../../UseCase';
import { KnowledgePatch } from '../KnowledgePatch';
import { KnowledgePatchId } from '../KnowledgePatchId';
import { SpaceId } from '../../spaces/SpaceId';

export type GetKnowledgePatchCommand = PackmindCommand & {
  patchId: KnowledgePatchId;
  spaceId: SpaceId;
};

export type GetKnowledgePatchResponse = {
  patch: KnowledgePatch;
};

export type IGetKnowledgePatchUseCase = IUseCase<
  GetKnowledgePatchCommand,
  GetKnowledgePatchResponse
>;
