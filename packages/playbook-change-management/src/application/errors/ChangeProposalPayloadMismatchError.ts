import { ChangeProposalType } from '@packmind/types';

export class ChangeProposalPayloadMismatchError extends Error {
  constructor(
    type: ChangeProposalType,
    oldValue: string,
    currentValue: string,
  ) {
    super(
      `Payload oldValue does not match current value for ${type}: expected "${currentValue}", got "${oldValue}"`,
    );
    this.name = 'ChangeProposalPayloadMismatchError';
  }
}
