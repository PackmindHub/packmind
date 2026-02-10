import { Injectable } from '@nestjs/common';
import {
  ChangeProposalType,
  CreateChangeProposalCommand,
  CreateChangeProposalResponse,
  IPlaybookChangeManagementPort,
} from '@packmind/types';
import { InjectPlaybookChangeManagementAdapter } from '../../shared/HexaInjection';

@Injectable()
export class OrganizationChangeProposalsService {
  constructor(
    @InjectPlaybookChangeManagementAdapter()
    private readonly playbookChangeManagementAdapter: IPlaybookChangeManagementPort,
  ) {}

  async createChangeProposal(
    command: CreateChangeProposalCommand<ChangeProposalType>,
  ): Promise<CreateChangeProposalResponse<ChangeProposalType>> {
    return this.playbookChangeManagementAdapter.createChangeProposal(command);
  }
}
