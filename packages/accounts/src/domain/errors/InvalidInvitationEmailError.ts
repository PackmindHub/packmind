import { maskEmail } from '@packmind/logger';
import { AccountsError } from './AccountsError';

export class InvalidInvitationEmailError extends AccountsError {
  constructor(email: string) {
    super(
      'invalid_input',
      'invalid_invitation_email',
      { email: maskEmail(email) },
      `Email "${maskEmail(email)}" is not a valid invitation target`,
    );
    this.name = 'InvalidInvitationEmailError';
  }
}
