export class InvitationConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvitationConfigurationError';
    Object.setPrototypeOf(this, InvitationConfigurationError.prototype);
  }
}
