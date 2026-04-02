import {
  ApplierObjectVersions,
  ChangeProposal,
  ApplyChangeProposalsResult,
  OrganizationId,
  SpaceId,
  UserId,
} from '@packmind/types';

export interface IChangesProposalApplier<
  Version extends ApplierObjectVersions,
> {
  areChangesApplicable(changeProposals: ChangeProposal[]): boolean;
  getVersion(artefactId: string): Promise<Version>;
  applyChangeProposals(
    source: Version,
    changeProposals: ChangeProposal[],
  ): ApplyChangeProposalsResult<Version>;
  saveNewVersion(
    version: Version,
    userId: UserId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
  ): Promise<Version>;
}
