import { IUseCase, PackmindCommand } from '../../UseCase';
import { SpaceId } from '../../spaces/SpaceId';

export type TriggerEmbeddingBackfillCommand = PackmindCommand & {
  spaceId: SpaceId;
};

export type TriggerEmbeddingBackfillResponse = {
  standardJobsEnqueued: number;
  recipeJobsEnqueued: number;
  totalJobsEnqueued: number;
};

export type ITriggerEmbeddingBackfillUseCase = IUseCase<
  TriggerEmbeddingBackfillCommand,
  TriggerEmbeddingBackfillResponse
>;
