import { Injectable } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import {
  ChangeProposal,
  ChangeProposalType,
  CreateChangeProposalCommand,
  CreateChangeProposalResponse,
  IPlaybookChangeManagementPort,
  ListCommandChangeProposalsCommand,
  ListCommandChangeProposalsResponse,
  OrganizationId,
  RecipeId,
  SpaceId,
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
    recipeId: RecipeId,
    changeProposalId: ChangeProposalId,
    organizationId: OrganizationId,
    spaceId: SpaceId,
    userId: UserId,
  ): Promise<ChangeProposal> {
    const result =
      await this.playbookChangeManagementAdapter.rejectCommandChangeProposal({
        recipeId,
        changeProposalId,
        organizationId,
        spaceId,
        userId,
      });
    return result.changeProposal;
  }
}
