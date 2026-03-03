export class ChangeProposalLimitExceededError extends Error {
  constructor(field: string, limit: number, actual: number) {
    super(`${field} exceeds limit of ${limit}: got ${actual}`);
    this.name = 'ChangeProposalLimitExceededError';
  }
}
