export class CannotDeleteDefaultSpaceError extends Error {
  constructor(spaceId: string) {
    super(`Cannot delete the default space ${spaceId}`);
    this.name = 'CannotDeleteDefaultSpaceError';
  }
}
