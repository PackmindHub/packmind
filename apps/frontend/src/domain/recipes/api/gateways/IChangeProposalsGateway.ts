import {
  BatchApplyChangeProposalItem,
  BatchApplyChangeProposalsResponse,
  BatchRejectChangeProposalItem,
  BatchRejectChangeProposalsResponse,
  ChangeProposal,
  ChangeProposalId,
  ChangeProposalWithOutdatedStatus,
  IListChangeProposalsBySpace,
  NewGateway,
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

  getGroupedChangeProposals: NewGateway<IListChangeProposalsBySpace>;

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

  batchApplyChangeProposals(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    proposals: BatchApplyChangeProposalItem[],
  ): Promise<BatchApplyChangeProposalsResponse>;

  batchRejectChangeProposals(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    proposals: BatchRejectChangeProposalItem[],
  ): Promise<BatchRejectChangeProposalsResponse>;
}
