import {
  ApplierObjectVersions,
  ApplyChangeProposalsResult,
  ChangeProposal,
  OrganizationId,
  Package,
  Recipe,
  RecipeVersion,
  Skill,
  SkillVersionWithFiles,
  SpaceId,
  Standard,
  StandardVersion,
  UpdatePackageCommand,
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

  deleteArtefact(
    source: Version,
    userId: UserId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
  ): Promise<void>;

  getUpdatePackageCommandWithoutArtefact(
    source: Version,
    pkg: Package,
  ): Pick<UpdatePackageCommand, 'recipeIds' | 'standardIds' | 'skillsIds'>;

  saveNewVersion(
    version: Version,
    userId: UserId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
  ): Promise<Version>;
}
