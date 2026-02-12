import {
  ChangeProposal,
  ChangeProposalId,
  ChangeProposalWithOutdatedStatus,
  OrganizationId,
  RecipeId,
  SpaceId,
} from '@packmind/types';

export interface IChangeProposalsGateway {
  getChangeProposals(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    recipeId: RecipeId,
  ): Promise<ChangeProposalWithOutdatedStatus[]>;

  applyChangeProposal(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    changeProposalId: ChangeProposalId,
    recipeId: RecipeId,
    force: boolean,
  ): Promise<ChangeProposal>;

  rejectChangeProposal(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    changeProposalId: ChangeProposalId,
    recipeId: RecipeId,
  ): Promise<ChangeProposal>;
}
