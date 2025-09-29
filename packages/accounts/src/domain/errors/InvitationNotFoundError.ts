export class InvitationNotFoundError extends Error {
  constructor() {
    super('Invitation not found or invalid');
    this.name = 'InvitationNotFoundError';
  }
}
