import { IUseCase, PackmindCommand } from '../../UseCase';
import { RecipeId } from '../../recipes/RecipeId';
import { ChangeProposal } from '../ChangeProposal';

export type ListCommandChangeProposalsCommand = PackmindCommand & {
  recipeId: RecipeId;
};

export type ListCommandChangeProposalsResponse = {
  changeProposals: ChangeProposal[];
};

export type IListCommandChangeProposalsUseCase = IUseCase<
  ListCommandChangeProposalsCommand,
  ListCommandChangeProposalsResponse
>;
