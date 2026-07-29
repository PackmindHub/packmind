import { ChangeProposal } from '../ChangeProposal';
import { ChangeProposalId } from '../ChangeProposalId';
import { ChangeProposalType } from '../ChangeProposalType';
import { ScalarUpdatePayload } from '../ChangeProposalPayload';
import { IChangeProposalMerger } from './IChangeProposalMerger';
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
  constructor(private readonly merger: IChangeProposalMerger) {}

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
            acc.removeFromPackages = [];
          } else if (hasRemoveFromPackages(change.decision)) {
            if (!acc.delete) {
              acc.removeFromPackages = this.handleRemoveFromPackages(
                acc.removeFromPackages,
                change.decision.removeFromPackages,
              );
            }
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

  protected getEffectivePayload<T extends ChangeProposalType>(
    changeProposal: ChangeProposal<T>,
  ): ChangeProposal<T>['payload'] {
    return (changeProposal.decision ??
      changeProposal.payload) as ChangeProposal<T>['payload'];
  }

  protected applyDiff(
    changeProposalId: ChangeProposalId,
    payload: ScalarUpdatePayload,
    sourceContent: string,
  ): string {
    const result = this.merger.mergeField(
      payload.oldValue,
      sourceContent,
      payload.newValue,
    );
    if (!result.clean) {
      throw new ChangeProposalConflictError(changeProposalId, result.conflicts);
    }
    return result.merged;
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
