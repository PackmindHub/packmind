export class SpaceAdminRequiredError extends Error {
  constructor(userId: string, spaceId: string) {
    super(`User ${userId} is not an admin of space ${spaceId}`);
    this.name = 'SpaceAdminRequiredError';
  }
}
