import { IUseCase, PackmindCommand } from '../../UseCase';
import { CommandId } from '../../commands/CommandId';
import { ChangeProposal } from '../ChangeProposal';
import { ChangeProposalId } from '../ChangeProposalId';
import { SpaceId } from '../../spaces';

export type RejectCommandChangeProposalCommand = PackmindCommand & {
  spaceId: SpaceId;
  recipeId: CommandId;
  changeProposalId: ChangeProposalId;
};

export type RejectCommandChangeProposalResponse = {
  changeProposal: ChangeProposal;
};

export type IRejectCommandChangeProposalUseCase = IUseCase<
  RejectCommandChangeProposalCommand,
  RejectCommandChangeProposalResponse
>;
