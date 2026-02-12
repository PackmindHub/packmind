import { IUseCase, PackmindCommand } from '../../UseCase';
import { RecipeId } from '../../recipes/RecipeId';
import { ChangeProposal } from '../ChangeProposal';
import { ChangeProposalId } from '../ChangeProposalId';
import { SpaceId } from '../../spaces';

export type ApplyCommandChangeProposalCommand = PackmindCommand & {
  spaceId: SpaceId;
  recipeId: RecipeId;
  changeProposalId: ChangeProposalId;
  force: boolean;
};

export type ApplyCommandChangeProposalResponse = {
  changeProposal: ChangeProposal;
};

export type IApplyCommandChangeProposalUseCase = IUseCase<
  ApplyCommandChangeProposalCommand,
  ApplyCommandChangeProposalResponse
>;
