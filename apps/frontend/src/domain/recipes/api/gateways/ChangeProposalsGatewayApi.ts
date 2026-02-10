import {
  ChangeProposal,
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
  ): Promise<ChangeProposal[]> {
    const response = await this._api.get<ListCommandChangeProposalsResponse>(
      `/organizations/${organizationId}/spaces/${spaceId}/change-proposals/${recipeId}`,
    );
    return response.changeProposals;
  }
}
