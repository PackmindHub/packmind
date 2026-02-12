import { ChangeProposalId } from '@packmind/types';

export class ChangeProposalConflictError extends Error {
  constructor(changeProposalId: ChangeProposalId) {
    super(
      `Change proposal "${changeProposalId}" conflicts with the current value and cannot be applied without force`,
    );
    this.name = 'ChangeProposalConflictError';
  }
}
