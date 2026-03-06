import { ChangeProposal } from '../ChangeProposal';
import { ChangeProposalId } from '../ChangeProposalId';
import { ChangeProposalType } from '../ChangeProposalType';
import { ScalarUpdatePayload } from '../ChangeProposalPayload';
import { DiffService } from './DiffService';
import { ChangeProposalConflictError } from './ChangeProposalConflictError';
import { ApplierObjectVersions } from './types';

export abstract class AbstractChangeProposalApplier<
  Version extends ApplierObjectVersions,
> {
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
