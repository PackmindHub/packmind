export class PasswordResetConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PasswordResetConfigurationError';
  }
}
