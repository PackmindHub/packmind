import {
  ChangeProposal,
  ChangeProposalId,
  ChangeProposalType,
  OrganizationId,
  ScalarUpdatePayload,
  SpaceId,
  UserId,
} from '@packmind/types';
import { DiffService } from '../../services';
import { ChangeProposalConflictError } from '../../../domain/errors';
import {
  IChangesProposalApplier,
  ObjectByVersion,
  ObjectVersions,
} from './IChangesProposalApplier';

export abstract class AbstractChangeProposalsApplier<
  Version extends ObjectVersions,
> implements IChangesProposalApplier<Version> {
  constructor(private readonly diffService: DiffService) {}

  applyChangeProposals(
    source: Version,
    changeProposals: ChangeProposal[],
  ): Version {
    return changeProposals.reduce(
      (newVersion, change) => this.applyChangeProposal(newVersion, change),
      source,
    );
  }

  abstract areChangesApplicable(changeProposals: ChangeProposal[]): boolean;

  protected checkChangesApplicable(
    changeProposals: ChangeProposal[],
    supportedChangeProposalTypes: ChangeProposalType[],
  ): boolean {
    for (const changeProposal of changeProposals) {
      if (!supportedChangeProposalTypes.includes(changeProposal.type)) {
        return false;
      }
    }
    return true;
  }

  abstract getVersion(
    artefactId: ObjectByVersion<Version>['id'],
  ): Promise<Version>;

  abstract saveNewVersion(
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

    return diffResult.value;
  }
}
