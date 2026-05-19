export class SpaceNotJoinableError extends Error {
  constructor(spaceId: string) {
    super(`Space ${spaceId} is not joinable`);
    this.name = 'SpaceNotJoinableError';
  }
}
