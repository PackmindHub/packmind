import { IUseCase, PackmindCommand } from '../../UseCase';

export type TriggerFullReembeddingCommand = PackmindCommand & {
  organizationId: string;
  userId: string;
};

export type TriggerFullReembeddingResponse = {
  /**
   * Number of standard versions queued for re-embedding
   */
  standardVersionsQueued: number;
  /**
   * Number of recipe versions queued for re-embedding
   */
  recipeVersionsQueued: number;
  /**
   * Total number of items queued
   */
  totalQueued: number;
};

export type ITriggerFullReembeddingUseCase = IUseCase<
  TriggerFullReembeddingCommand,
  TriggerFullReembeddingResponse
>;
