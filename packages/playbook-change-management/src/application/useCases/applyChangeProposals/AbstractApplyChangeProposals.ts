import {
  ChangeProposal,
  ChangeProposalId,
  OrganizationId,
  RecipeVersion,
  ScalarUpdatePayload,
  SkillVersion,
  SpaceId,
  StandardVersion,
  UserId,
} from '@packmind/types';
import { DiffService } from '../../services';
import { ChangeProposalConflictError } from '../../../domain/errors';

type ObjectVersions = RecipeVersion | StandardVersion | SkillVersion;

export abstract class AbstractApplyChangeProposals<
  Version extends ObjectVersions,
> {
  constructor(private readonly diffService: DiffService) {}

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

  protected applyDiff(
    changeProposalId: ChangeProposalId,
    payload: ScalarUpdatePayload,
    sourceContent: string,
  ): string {
    const diffResult = this.diffService.applyLineDiff(
      payload.oldValue,
      payload.newValue,
      sourceContent,
    );

    if (!diffResult.success) {
      throw new ChangeProposalConflictError(changeProposalId);
    }

    console.log({ payload, diffResult });
    return diffResult.value;
  }
}
