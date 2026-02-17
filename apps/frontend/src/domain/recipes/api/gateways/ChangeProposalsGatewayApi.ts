import {
  BatchApplyChangeProposalItem,
  BatchApplyChangeProposalsResponse,
  BatchRejectChangeProposalItem,
  BatchRejectChangeProposalsResponse,
  ChangeProposal,
  ChangeProposalId,
  ChangeProposalWithOutdatedStatus,
  ListCommandChangeProposalsResponse,
  OrganizationId,
  RecipeId,
  SpaceId,
} from '@packmind/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { IChangeProposalsGateway } from './IChangeProposalsGateway';

export class ChangeProposalsGatewayApi
  extends PackmindGateway
  implements IChangeProposalsGateway
{
  constructor() {
    super('/change-proposals');
  }

  async getChangeProposals(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    recipeId: RecipeId,
  ): Promise<ChangeProposalWithOutdatedStatus[]> {
    const response = await this._api.get<ListCommandChangeProposalsResponse>(
      `/organizations/${organizationId}/spaces/${spaceId}/change-proposals/${recipeId}`,
    );
    return response.changeProposals;
  }

  async applyChangeProposal(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    changeProposalId: ChangeProposalId,
    recipeId: RecipeId,
    force: boolean,
  ): Promise<ChangeProposal> {
    return this._api.post(
      `/organizations/${organizationId}/spaces/${spaceId}/change-proposals/${changeProposalId}/apply`,
      { recipeId, force },
    );
  }

  async rejectChangeProposal(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    changeProposalId: ChangeProposalId,
    recipeId: RecipeId,
  ): Promise<ChangeProposal> {
    return this._api.post(
      `/organizations/${organizationId}/spaces/${spaceId}/change-proposals/${changeProposalId}/reject`,
      { recipeId },
    );
  }

  async batchApplyChangeProposals(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    proposals: BatchApplyChangeProposalItem[],
  ): Promise<BatchApplyChangeProposalsResponse> {
    return this._api.post(
      `/organizations/${organizationId}/spaces/${spaceId}/change-proposals/batch-apply`,
      { proposals },
    );
  }

  async batchRejectChangeProposals(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    proposals: BatchRejectChangeProposalItem[],
  ): Promise<BatchRejectChangeProposalsResponse> {
    return this._api.post(
      `/organizations/${organizationId}/spaces/${spaceId}/change-proposals/batch-reject`,
      { proposals },
    );
  }
}
