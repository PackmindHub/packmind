import {
  ChangeProposal,
  OrganizationId,
  RecipeVersion,
  SkillVersion,
  SpaceId,
  StandardVersion,
  UserId,
} from '@packmind/types';

type ObjectVersions = RecipeVersion | StandardVersion | SkillVersion;

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
    userId: UserId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
  ): Promise<Version>;

  protected abstract applyChangeProposal(
    source: Version,
    changeProposal: ChangeProposal,
  ): Version;
}
