import { IUseCase, PackmindCommand } from '../../UseCase';
import { CommandId } from '../../commands/CommandId';
import { ChangeProposal } from '../ChangeProposal';
import { SpaceId } from '../../spaces';

export type ChangeProposalWithOutdatedStatus = ChangeProposal & {
  outdated: boolean;
};

export type ListCommandChangeProposalsCommand = PackmindCommand & {
  spaceId: SpaceId;
  recipeId: CommandId;
};

export type ListCommandChangeProposalsResponse = {
  changeProposals: ChangeProposalWithOutdatedStatus[];
};

export type IListCommandChangeProposalsUseCase = IUseCase<
  ListCommandChangeProposalsCommand,
  ListCommandChangeProposalsResponse
>;
