import { IUseCase, PackmindCommand } from '../../UseCase';
import { KnowledgePatch } from '../KnowledgePatch';
import { KnowledgePatchStatus } from '../KnowledgePatchStatus';
import { SpaceId } from '../../spaces/SpaceId';

export type ListKnowledgePatchesCommand = PackmindCommand & {
  spaceId: SpaceId;
  status?: KnowledgePatchStatus;
};

export type ListKnowledgePatchesResponse = {
  patches: KnowledgePatch[];
};

export type IListKnowledgePatchesUseCase = IUseCase<
  ListKnowledgePatchesCommand,
  ListKnowledgePatchesResponse
>;
