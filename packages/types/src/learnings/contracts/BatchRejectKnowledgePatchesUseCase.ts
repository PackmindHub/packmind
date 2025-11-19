import { IUseCase, PackmindCommand } from '../../UseCase';
import { KnowledgePatchId } from '../KnowledgePatchId';
import { SpaceId } from '../../spaces/SpaceId';

export type BatchRejectKnowledgePatchesCommand = PackmindCommand & {
  patchIds: KnowledgePatchId[];
  spaceId: SpaceId;
  reviewedBy: string;
  reviewNotes: string;
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type BatchRejectKnowledgePatchesResponse = {};

export type IBatchRejectKnowledgePatchesUseCase = IUseCase<
  BatchRejectKnowledgePatchesCommand,
  BatchRejectKnowledgePatchesResponse
>;
