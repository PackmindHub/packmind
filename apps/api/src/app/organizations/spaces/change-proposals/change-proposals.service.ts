import { Injectable } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import {
  ApplyCommandChangeProposalCommand,
  ChangeProposal,
  ChangeProposalType,
  CreateChangeProposalCommand,
  CreateChangeProposalResponse,
  IPlaybookChangeManagementPort,
  ListCommandChangeProposalsCommand,
  ListCommandChangeProposalsResponse,
  RejectCommandChangeProposalCommand,
} from '@packmind/types';
import { InjectPlaybookChangeManagementAdapter } from '../../../shared/HexaInjection';

@Injectable()
export class ChangeProposalsService {
  constructor(
    @InjectPlaybookChangeManagementAdapter()
    private readonly playbookChangeManagementAdapter: IPlaybookChangeManagementPort,
    private readonly logger: PackmindLogger,
  ) {}

  async applyChangeProposal(
    command: ApplyCommandChangeProposalCommand,
  ): Promise<ChangeProposal> {
    const result =
      await this.playbookChangeManagementAdapter.applyCommandChangeProposal(
        command,
      );
    return result.changeProposal;
  }

  async createChangeProposal(
    command: CreateChangeProposalCommand<ChangeProposalType>,
  ): Promise<CreateChangeProposalResponse<ChangeProposalType>> {
    return this.playbookChangeManagementAdapter.createChangeProposal(command);
  }

  async listCommandChangeProposals(
    command: ListCommandChangeProposalsCommand,
  ): Promise<ListCommandChangeProposalsResponse> {
    return this.playbookChangeManagementAdapter.listCommandChangeProposals(
      command,
    );
  }

  async rejectChangeProposal(
    command: RejectCommandChangeProposalCommand,
  ): Promise<ChangeProposal> {
    const result =
      await this.playbookChangeManagementAdapter.rejectCommandChangeProposal(
        command,
      );
    return result.changeProposal;
  }
}
