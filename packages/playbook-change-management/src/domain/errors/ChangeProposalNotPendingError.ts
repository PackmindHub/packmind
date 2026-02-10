import { ChangeProposalId, ChangeProposalStatus } from '@packmind/types';

export class ChangeProposalNotPendingError extends Error {
  constructor(
    changeProposalId: ChangeProposalId,
    currentStatus: ChangeProposalStatus,
  ) {
    super(
      `Change proposal "${changeProposalId}" cannot be rejected: current status is "${currentStatus}"`,
    );
    this.name = 'ChangeProposalNotPendingError';
    Object.setPrototypeOf(this, ChangeProposalNotPendingError.prototype);
  }
}
