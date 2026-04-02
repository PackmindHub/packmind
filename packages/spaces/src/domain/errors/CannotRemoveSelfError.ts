export class CannotRemoveSelfError extends Error {
  constructor(userId: string, spaceId: string) {
    super(`User ${userId} cannot remove themselves from space ${spaceId}`);
    this.name = 'CannotRemoveSelfError';
  }
}
