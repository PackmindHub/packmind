import { Injectable } from '@nestjs/common';
import {
  ApplyChangeProposalsCommand,
  ApplyChangeProposalsResponse,
  IPlaybookChangeManagementPort,
  ListChangeProposalsByArtefactCommand,
  ListChangeProposalsByArtefactResponse,
  SkillId,
} from '@packmind/types';
import { InjectPlaybookChangeManagementAdapter } from '../../../../shared/HexaInjection';

@Injectable()
export class SkillsChangeProposalsService {
  constructor(
    @InjectPlaybookChangeManagementAdapter()
    private readonly playbookChangeManagementAdapter: IPlaybookChangeManagementPort,
  ) {}

  async listChangeProposalsBySkill(
    command: ListChangeProposalsByArtefactCommand<SkillId>,
  ): Promise<ListChangeProposalsByArtefactResponse> {
    return this.playbookChangeManagementAdapter.listChangeProposalsByArtefact(
      command,
    );
  }

  async applySkillChangeProposals(
    command: ApplyChangeProposalsCommand<SkillId>,
  ): Promise<ApplyChangeProposalsResponse<SkillId>> {
    return this.playbookChangeManagementAdapter.applyChangeProposals(command);
  }
}
