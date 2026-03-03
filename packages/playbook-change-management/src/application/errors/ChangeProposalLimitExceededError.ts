import { ChangeProposalViolation } from '@packmind/types';

export class ChangeProposalLimitExceededError extends Error {
  readonly changeProposal: ChangeProposalViolation;
  readonly wasCreated = false;

  constructor(
    violation: ChangeProposalViolation,
    limit: number,
    actual: number,
  ) {
    super(`${violation} exceeds limit of ${limit}: got ${actual}`);
    this.name = 'ChangeProposalLimitExceededError';
    this.changeProposal = violation;
  }
}
