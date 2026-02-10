import {
  ChangeProposal,
  OrganizationId,
  RecipeId,
  SpaceId,
} from '@packmind/types';

export interface IChangeProposalsGateway {
  getChangeProposals(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    recipeId: RecipeId,
  ): Promise<ChangeProposal[]>;
}
