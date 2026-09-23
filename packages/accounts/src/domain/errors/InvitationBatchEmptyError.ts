import { AccountsError } from './AccountsError';

export class InvitationBatchEmptyError extends AccountsError {
  constructor() {
    super(
      'invalid_input',
      'invitation_batch_empty',
      {},
      'At least one email must be provided to create invitations',
    );
    this.name = 'InvitationBatchEmptyError';
  }
}
