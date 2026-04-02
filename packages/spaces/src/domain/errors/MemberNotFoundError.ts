export class MemberNotFoundError extends Error {
  constructor(userId: string, spaceId: string) {
    super(`User ${userId} is not a member of space ${spaceId}`);
    this.name = 'MemberNotFoundError';
  }
}
