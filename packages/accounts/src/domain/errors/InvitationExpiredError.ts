export class InvitationExpiredError extends Error {
  constructor() {
    super('Invitation has expired');
    this.name = 'InvitationExpiredError';
  }
}
