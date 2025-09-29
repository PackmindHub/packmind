export class InvitationBatchEmptyError extends Error {
  constructor() {
    super('At least one email must be provided to create invitations');
    this.name = 'InvitationBatchEmptyError';
    Object.setPrototypeOf(this, InvitationBatchEmptyError.prototype);
  }
}
