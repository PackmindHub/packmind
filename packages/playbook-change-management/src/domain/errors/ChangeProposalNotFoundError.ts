import { ChangeProposalId } from '@packmind/types';

export class ChangeProposalNotFoundError extends Error {
  constructor(changeProposalId: ChangeProposalId) {
    super(`Change proposal with id "${changeProposalId}" was not found`);
    this.name = 'ChangeProposalNotFoundError';
    Object.setPrototypeOf(this, ChangeProposalNotFoundError.prototype);
  }
}
