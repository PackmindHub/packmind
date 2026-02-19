import { Injectable } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import {
  BatchCreateChangeProposalsCommand,
  BatchCreateChangeProposalsResponse,
  ChangeProposalType,
  CreateChangeProposalCommand,
  CreateChangeProposalResponse,
  IPlaybookChangeManagementPort,
  ListChangeProposalsBySpaceCommand,
  ListChangeProposalsBySpaceResponse,
} from '@packmind/types';
import { InjectPlaybookChangeManagementAdapter } from '../../../shared/HexaInjection';

@Injectable()
export class ChangeProposalsService {
  constructor(
    @InjectPlaybookChangeManagementAdapter()
    private readonly playbookChangeManagementAdapter: IPlaybookChangeManagementPort,
    private readonly logger: PackmindLogger,
  ) {}

  async batchCreateChangeProposals(
    command: BatchCreateChangeProposalsCommand,
  ): Promise<BatchCreateChangeProposalsResponse> {
    return this.playbookChangeManagementAdapter.batchCreateChangeProposals(
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
}
