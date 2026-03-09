import {
  ApplierObjectVersions,
  ApplyChangeProposalsResult,
  ChangeProposal,
  OrganizationId,
  Recipe,
  RecipeVersion,
  Skill,
  SkillVersionWithFiles,
  SpaceId,
  Standard,
  StandardVersion,
  UserId,
} from '@packmind/types';

export type ObjectVersions = ApplierObjectVersions;

export type ObjectByVersion<T extends ObjectVersions> = T extends RecipeVersion
  ? Recipe
  : T extends SkillVersionWithFiles
    ? Skill
    : T extends StandardVersion
      ? Standard
      : never;

export interface IChangesProposalApplier<
  Version extends ApplierObjectVersions,
> {
  areChangesApplicable(changeProposals: ChangeProposal[]): boolean;

  getVersion(artefactId: ObjectByVersion<Version>['id']): Promise<Version>;

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
