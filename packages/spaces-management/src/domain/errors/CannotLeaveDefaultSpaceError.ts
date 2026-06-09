export class CannotLeaveDefaultSpaceError extends Error {
  constructor(spaceId: string) {
    super(`Cannot leave default space ${spaceId}`);
    this.name = 'CannotLeaveDefaultSpaceError';
  }
}
