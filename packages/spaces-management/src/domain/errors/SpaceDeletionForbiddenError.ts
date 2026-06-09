export class SpaceDeletionForbiddenError extends Error {
  constructor(userId: string, spaceId: string) {
    super(`User ${userId} is not authorized to delete space ${spaceId}`);
    this.name = 'SpaceDeletionForbiddenError';
  }
}
