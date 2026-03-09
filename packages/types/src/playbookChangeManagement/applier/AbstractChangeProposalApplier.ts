import { ChangeProposal } from '../ChangeProposal';
import { ChangeProposalId } from '../ChangeProposalId';
import { ChangeProposalType } from '../ChangeProposalType';
import { ScalarUpdatePayload } from '../ChangeProposalPayload';
import { DiffService } from './DiffService';
import { ChangeProposalConflictError } from './ChangeProposalConflictError';
import { ApplierObjectVersions } from './types';
import { PackageId } from '../../deployments';
import { isExpectedChangeProposalType } from './isExpectedChangeProposalType';

export type ApplyChangeProposalsResult<Version extends ApplierObjectVersions> =
  {
    version: Version;
    removeFromPackages: PackageId[];
    delete: boolean;
  };

export abstract class AbstractChangeProposalApplier<
  Version extends ApplierObjectVersions,
> {
  constructor(private readonly diffService: DiffService) {}

  applyChangeProposals(
    source: Version,
    changeProposals: ChangeProposal[],
  ): ApplyChangeProposalsResult<Version> {
    return changeProposals.reduce(
      (acc, change) => {
        if (
          change.decision &&
          (isExpectedChangeProposalType(
            change,
            ChangeProposalType.removeCommand,
          ) ||
            isExpectedChangeProposalType(
              change,
              ChangeProposalType.removeStandard,
            ) ||
            isExpectedChangeProposalType(
              change,
              ChangeProposalType.removeSkill,
            ))
        ) {
          if (change.decision?.delete) {
            acc.delete = true;
          } else if (hasRemoveFromPackages(change.decision)) {
            acc.removeFromPackages = this.handleRemoveFromPackages(
              acc.removeFromPackages,
              change.decision.removeFromPackages,
            );
          }
        }
        acc.version = this.applyChangeProposal(acc.version, change);

        return acc;
      },
      {
        version: source,
        removeFromPackages: [],
        delete: false,
      } as ApplyChangeProposalsResult<Version>,
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

  private handleRemoveFromPackages(
    original: PackageId[],
    added: PackageId[] | null,
  ): PackageId[] {
    if (added !== null) {
      return Array.from(new Set([...original, ...added]));
    }

    return original;
  }
}

/* Somehow, @packmind/migrations fails to properly get the RemoveArtefactDecision types*/
function hasRemoveFromPackages(
  tbd: unknown,
): tbd is { removeFromPackages: PackageId[] } {
  return (
    (tbd as { removeFromPackages: PackageId[] }).removeFromPackages !==
    undefined
  );
}
