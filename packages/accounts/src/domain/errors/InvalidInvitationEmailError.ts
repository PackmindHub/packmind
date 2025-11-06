import { maskEmail } from '@packmind/logger';

export class InvalidInvitationEmailError extends Error {
  constructor(email: string) {
    super(`Email "${maskEmail(email)}" is not a valid invitation target`);
    this.name = 'InvalidInvitationEmailError';
    Object.setPrototypeOf(this, InvalidInvitationEmailError.prototype);
  }
}
