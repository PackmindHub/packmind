export class SpaceMembershipNotFoundError extends Error {
  constructor(userId: string, spaceId: string) {
    super(`Membership not found for user ${userId} in space ${spaceId}`);
    this.name = 'SpaceMembershipNotFoundError';
  }
}
