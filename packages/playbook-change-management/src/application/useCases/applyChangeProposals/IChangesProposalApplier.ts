import {
  ChangeProposal,
  OrganizationId,
  Recipe,
  RecipeVersion,
  Skill,
  SkillFile,
  SkillVersion,
  SpaceId,
  Standard,
  StandardVersion,
  UserId,
} from '@packmind/types';

export type SkillVersionWithFiles = SkillVersion & {
  files: SkillFile[];
};

export type ObjectVersions =
  | RecipeVersion
  | StandardVersion
  | SkillVersionWithFiles;

export type ObjectByVersion<T extends ObjectVersions> = T extends RecipeVersion
  ? Recipe
  : T extends SkillVersionWithFiles
    ? Skill
    : T extends StandardVersion
      ? Standard
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
