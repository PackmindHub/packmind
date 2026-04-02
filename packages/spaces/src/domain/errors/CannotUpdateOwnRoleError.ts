export class CannotUpdateOwnRoleError extends Error {
  constructor(userId: string, spaceId: string) {
    super(`User ${userId} cannot update their own role in space ${spaceId}`);
    this.name = 'CannotUpdateOwnRoleError';
  }
}
