import { IUseCase, PackmindCommand } from '../../UseCase';
import { RecipeId } from '../../recipes/RecipeId';
import { ChangeProposal } from '../ChangeProposal';
import { ChangeProposalId } from '../ChangeProposalId';

export type RejectCommandChangeProposalCommand = PackmindCommand & {
  recipeId: RecipeId;
  changeProposalId: ChangeProposalId;
};

export type RejectCommandChangeProposalResponse = {
  changeProposal: ChangeProposal;
};

export type IRejectCommandChangeProposalUseCase = IUseCase<
  RejectCommandChangeProposalCommand,
  RejectCommandChangeProposalResponse
>;
