import { ChangeProposalId, ChangeProposalStatus } from '@packmind/types';

export class ChangeProposalNotPendingError extends Error {
  constructor(
    changeProposalId: ChangeProposalId,
    currentStatus: ChangeProposalStatus,
  ) {
    super(
      `Change proposal "${changeProposalId}" is not pending: current status is "${currentStatus}"`,
    );
    this.name = 'ChangeProposalNotPendingError';
  }
}
