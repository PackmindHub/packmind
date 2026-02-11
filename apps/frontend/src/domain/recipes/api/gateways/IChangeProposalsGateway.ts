import {
  ChangeProposal,
  ChangeProposalId,
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

  rejectChangeProposal(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    changeProposalId: ChangeProposalId,
    recipeId: RecipeId,
  ): Promise<ChangeProposal>;
}
