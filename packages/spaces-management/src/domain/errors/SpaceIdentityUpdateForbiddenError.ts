export class SpaceIdentityUpdateForbiddenError extends Error {
  constructor(userId: string, spaceId: string) {
    super(
      `User ${userId} is not authorized to update identity of space ${spaceId}`,
    );
    this.name = 'SpaceIdentityUpdateForbiddenError';
  }
}
