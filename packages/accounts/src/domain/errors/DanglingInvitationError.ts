import { AccountsInternalError } from './AccountsInternalError';

export class DanglingInvitationError extends AccountsInternalError {
  constructor(invitationId: string) {
    super(
      'dangling_invitation',
      { invitationId },
      'User not found for the given invitation',
    );
    this.name = 'DanglingInvitationError';
  }
}
