import { IUseCase, PackmindCommand } from '../../UseCase';
import { RecipeId } from '../../recipes/RecipeId';
import { ChangeProposal } from '../ChangeProposal';
import { SpaceId } from '../../spaces';

export type ChangeProposalWithOutdatedStatus = ChangeProposal & {
  outdated: boolean;
};

export type ListCommandChangeProposalsCommand = PackmindCommand & {
  spaceId: SpaceId;
  recipeId: RecipeId;
};

export type ListCommandChangeProposalsResponse = {
  changeProposals: ChangeProposalWithOutdatedStatus[];
};

export type IListCommandChangeProposalsUseCase = IUseCase<
  ListCommandChangeProposalsCommand,
  ListCommandChangeProposalsResponse
>;
