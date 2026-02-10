import {
  CreateChangeProposalCommand,
  CreateChangeProposalResponse,
} from '../contracts/ICreateChangeProposalUseCase';
import {
  CreateCommandChangeProposalCommand,
  CreateCommandChangeProposalResponse,
} from '../contracts/ICreateCommandChangeProposalUseCase';
import {
  ListCommandChangeProposalsCommand,
  ListCommandChangeProposalsResponse,
} from '../contracts/IListCommandChangeProposalsUseCase';
import { ChangeProposalType } from '../ChangeProposalType';

export const IPlaybookChangeManagementPortName =
  'IPlaybookChangeManagementPort' as const;

export interface IPlaybookChangeManagementPort {
  createChangeProposal<T extends ChangeProposalType>(
    command: CreateChangeProposalCommand<T>,
  ): Promise<CreateChangeProposalResponse<T>>;

  createCommandChangeProposal(
    command: CreateCommandChangeProposalCommand,
  ): Promise<CreateCommandChangeProposalResponse>;

  listCommandChangeProposals(
    command: ListCommandChangeProposalsCommand,
  ): Promise<ListCommandChangeProposalsResponse>;
}
