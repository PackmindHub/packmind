export class InviterNotFoundError extends Error {
  constructor(userId: string) {
    super(`Inviter with id "${userId}" was not found`);
    this.name = 'InviterNotFoundError';
    Object.setPrototypeOf(this, InviterNotFoundError.prototype);
  }
}
