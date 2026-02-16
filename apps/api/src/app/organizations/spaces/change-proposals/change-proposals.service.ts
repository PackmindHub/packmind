import { Injectable } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import {
  ApplyCommandChangeProposalCommand,
  BatchApplyChangeProposalsCommand,
  BatchApplyChangeProposalsResponse,
  BatchCreateChangeProposalsCommand,
  BatchCreateChangeProposalsResponse,
  BatchRejectChangeProposalsCommand,
  BatchRejectChangeProposalsResponse,
  ChangeProposal,
  ChangeProposalType,
  CreateChangeProposalCommand,
  CreateChangeProposalResponse,
  IPlaybookChangeManagementPort,
  ListChangeProposalsBySpaceCommand,
  ListChangeProposalsBySpaceResponse,
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

  async batchApplyChangeProposals(
    command: BatchApplyChangeProposalsCommand,
  ): Promise<BatchApplyChangeProposalsResponse> {
    return this.playbookChangeManagementAdapter.batchApplyChangeProposals(
      command,
    );
  }

  async batchCreateChangeProposals(
    command: BatchCreateChangeProposalsCommand,
  ): Promise<BatchCreateChangeProposalsResponse> {
    return this.playbookChangeManagementAdapter.batchCreateChangeProposals(
      command,
    );
  }

  async batchRejectChangeProposals(
    command: BatchRejectChangeProposalsCommand,
  ): Promise<BatchRejectChangeProposalsResponse> {
    return this.playbookChangeManagementAdapter.batchRejectChangeProposals(
      command,
    );
  }

  async createChangeProposal(
    command: CreateChangeProposalCommand<ChangeProposalType>,
  ): Promise<CreateChangeProposalResponse<ChangeProposalType>> {
    return this.playbookChangeManagementAdapter.createChangeProposal(command);
  }

  async listChangeProposalsBySpace(
    command: ListChangeProposalsBySpaceCommand,
  ): Promise<ListChangeProposalsBySpaceResponse> {
    return this.playbookChangeManagementAdapter.listChangeProposalsBySpace(
      command,
    );
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
