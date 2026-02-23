import {
  ChangeProposal,
  OrganizationId,
  Recipe,
  RecipeVersion,
  Skill,
  SkillVersion,
  SpaceId,
  Standard,
  StandardVersion,
  UserId,
} from '@packmind/types';

export type ObjectVersions = RecipeVersion | StandardVersion | SkillVersion;

export type ObjectByVersion<T extends ObjectVersions> = T extends RecipeVersion
  ? Recipe
  : T extends SkillVersion
    ? Standard
    : T extends StandardVersion
      ? Skill
      : never;

export interface IChangesProposalApplier<Version extends ObjectVersions> {
  areChangesApplicable(changeProposals: ChangeProposal[]): boolean;

  getVersion(artefactId: ObjectByVersion<Version>['id']): Promise<Version>;

  applyChangeProposals(
    source: Version,
    changeProposals: ChangeProposal[],
  ): Version;

  saveNewVersion(
    version: Version,
    userId: UserId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
  ): Promise<Version>;
}
