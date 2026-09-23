import { AccountsError } from './AccountsError';

export class InvitationNotFoundError extends AccountsError {
  constructor() {
    super(
      'not_found',
      'invitation_not_found',
      {},
      'Invitation not found or invalid',
    );
    this.name = 'InvitationNotFoundError';
  }
}
