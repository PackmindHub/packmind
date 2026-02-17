import { Injectable } from '@nestjs/common';
import {
  ApplyChangeProposalsCommand,
  ApplyChangeProposalsResponse,
  IPlaybookChangeManagementPort,
  ListChangeProposalsByArtefactCommand,
  ListChangeProposalsByArtefactResponse,
  StandardId,
} from '@packmind/types';
import { InjectPlaybookChangeManagementAdapter } from '../../../../shared/HexaInjection';

@Injectable()
export class StandardsChangeProposalsService {
  constructor(
    @InjectPlaybookChangeManagementAdapter()
    private readonly playbookChangeManagementAdapter: IPlaybookChangeManagementPort,
  ) {}

  async listChangeProposalsByStandard(
    command: ListChangeProposalsByArtefactCommand<StandardId>,
  ): Promise<ListChangeProposalsByArtefactResponse> {
    return this.playbookChangeManagementAdapter.listChangeProposalsByArtefact(
      command,
    );
  }

  async applyStandardChangeProposals(
    command: ApplyChangeProposalsCommand<StandardId>,
  ): Promise<ApplyChangeProposalsResponse> {
    return this.playbookChangeManagementAdapter.applyChangeProposals(command);
  }
}
