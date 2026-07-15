import { IUseCase, PackmindCommand } from '../../UseCase';
import { CommandId } from '../../commands/CommandId';
import { ChangeProposal } from '../ChangeProposal';
import { ChangeProposalId } from '../ChangeProposalId';
import { SpaceId } from '../../spaces';

export type ApplyCommandChangeProposalCommand = PackmindCommand & {
  spaceId: SpaceId;
  recipeId: CommandId;
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
