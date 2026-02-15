import { IUseCase, PackmindCommand } from '../../UseCase';
import { RecipeId } from '../../recipes/RecipeId';
import { ChangeProposalId } from '../ChangeProposalId';
import { SpaceId } from '../../spaces';

export type BatchApplyChangeProposalItem = {
  changeProposalId: ChangeProposalId;
  recipeId: RecipeId;
  force: boolean;
};

export type BatchApplyChangeProposalsCommand = PackmindCommand & {
  spaceId: SpaceId;
  proposals: BatchApplyChangeProposalItem[];
};

export type BatchApplyChangeProposalsResponse = {
  applied: number;
  errors: Array<{ index: number; message: string }>;
};

export type IBatchApplyChangeProposalsUseCase = IUseCase<
  BatchApplyChangeProposalsCommand,
  BatchApplyChangeProposalsResponse
>;
