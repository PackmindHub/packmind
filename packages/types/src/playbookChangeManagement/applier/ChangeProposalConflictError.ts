import { ChangeProposalId } from '../ChangeProposalId';
import { MergeConflictRegion } from './IChangeProposalMerger';

export class ChangeProposalConflictError extends Error {
  constructor(
    changeProposalId: ChangeProposalId,
    public readonly regions: MergeConflictRegion[] = [],
  ) {
    super(
      `Change proposal "${changeProposalId}" conflicts with the current value and cannot be applied without force`,
    );
    this.name = 'ChangeProposalConflictError';
  }
}
