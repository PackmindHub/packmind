import {
  ChangeProposal,
  ChangeProposalType,
  Recipe,
  RecipeVersion,
  Skill,
  SkillVersion,
  Standard,
  StandardVersion,
} from '@packmind/types';

type ObjectVersions = RecipeVersion | StandardVersion | SkillVersion;

export type SourceObject<T extends ObjectVersions> = T extends RecipeVersion
  ? Recipe
  : T extends StandardVersion
    ? Standard
    : T extends SkillVersion
      ? Skill
      : never;

export abstract class AbstractApplyChangeProposals<
  Version extends ObjectVersions,
> {
  public applyChangeProposals(
    source: Version,
    changeProposals: ChangeProposal[],
  ): Version {
    return changeProposals.reduce(
      (newVersion, change) => this.applyChangeProposal(newVersion, change),
      source,
    );
  }

  public abstract saveNewVersion(
    version: Version,
  ): Promise<SourceObject<Version>>;

  protected abstract applyChangeProposal(
    source: Version,
    changeProposal: ChangeProposal,
  ): Version;
}
