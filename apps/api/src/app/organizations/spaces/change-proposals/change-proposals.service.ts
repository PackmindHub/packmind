import { Injectable } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import {
  ChangeProposal,
  IPlaybookChangeManagementPort,
  ListCommandChangeProposalsCommand,
  ListCommandChangeProposalsResponse,
  OrganizationId,
  RecipeId,
  ChangeProposalId,
  UserId,
} from '@packmind/types';
import { InjectPlaybookChangeManagementAdapter } from '../../../shared/HexaInjection';

@Injectable()
export class ChangeProposalsService {
  constructor(
    @InjectPlaybookChangeManagementAdapter()
    private readonly playbookChangeManagementAdapter: IPlaybookChangeManagementPort,
    private readonly logger: PackmindLogger,
  ) {}

  async listCommandChangeProposals(
    command: ListCommandChangeProposalsCommand,
  ): Promise<ListCommandChangeProposalsResponse> {
    return this.playbookChangeManagementAdapter.listCommandChangeProposals(
      command,
    );
  }

  async rejectChangeProposal(
    recipeId: RecipeId,
    changeProposalId: ChangeProposalId,
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<ChangeProposal> {
    const result =
      await this.playbookChangeManagementAdapter.rejectCommandChangeProposal({
        recipeId,
        changeProposalId,
        organizationId,
        userId,
      });
    return result.changeProposal;
  }
}
