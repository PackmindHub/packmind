export class PasswordResetTokenExpiredError extends Error {
  constructor() {
    super('Password reset token not found or expired');
    this.name = 'PasswordResetTokenExpiredError';
  }
}
