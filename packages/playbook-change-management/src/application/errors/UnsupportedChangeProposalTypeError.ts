import { ChangeProposalType } from '@packmind/types';

export class UnsupportedChangeProposalTypeError extends Error {
  constructor(type: ChangeProposalType) {
    super(`Unsupported change proposal type: ${type}`);
    this.name = 'UnsupportedChangeProposalTypeError';
  }
}
