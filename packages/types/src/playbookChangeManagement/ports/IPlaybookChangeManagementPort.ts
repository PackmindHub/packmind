import {
  CreateCommandChangeProposalCommand,
  CreateCommandChangeProposalResponse,
} from '../contracts/ICreateCommandChangeProposalUseCase';
import {
  ListCommandChangeProposalsCommand,
  ListCommandChangeProposalsResponse,
} from '../contracts/IListCommandChangeProposalsUseCase';

export const IPlaybookChangeManagementPortName =
  'IPlaybookChangeManagementPort' as const;

export interface IPlaybookChangeManagementPort {
  createCommandChangeProposal(
    command: CreateCommandChangeProposalCommand,
  ): Promise<CreateCommandChangeProposalResponse>;

  listCommandChangeProposals(
    command: ListCommandChangeProposalsCommand,
  ): Promise<ListCommandChangeProposalsResponse>;
}
