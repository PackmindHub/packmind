import { IUseCase, PackmindCommand } from '../../UseCase';
import { RecipeId } from '../../recipes/RecipeId';
import { ChangeProposalId } from '../ChangeProposalId';
import { SpaceId } from '../../spaces';

export type BatchRejectChangeProposalItem = {
  changeProposalId: ChangeProposalId;
  recipeId: RecipeId;
};

export type BatchRejectChangeProposalsCommand = PackmindCommand & {
  spaceId: SpaceId;
  proposals: BatchRejectChangeProposalItem[];
};

export type BatchRejectChangeProposalsResponse = {
  rejected: number;
  errors: Array<{ index: number; message: string }>;
};

export type IBatchRejectChangeProposalsUseCase = IUseCase<
  BatchRejectChangeProposalsCommand,
  BatchRejectChangeProposalsResponse
>;
