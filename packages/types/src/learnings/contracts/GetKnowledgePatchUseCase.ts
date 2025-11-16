import { IUseCase, PackmindCommand } from '../../UseCase';
import { KnowledgePatch } from '../KnowledgePatch';
import { KnowledgePatchId } from '../KnowledgePatchId';
import { SpaceId } from '../../spaces/SpaceId';
import { Topic } from '../Topic';

export type GetKnowledgePatchCommand = PackmindCommand & {
  patchId: KnowledgePatchId;
  spaceId: SpaceId;
};

export type GetKnowledgePatchResponse = {
  patch: KnowledgePatch;
  topics: Topic[];
};

export type IGetKnowledgePatchUseCase = IUseCase<
  GetKnowledgePatchCommand,
  GetKnowledgePatchResponse
>;
