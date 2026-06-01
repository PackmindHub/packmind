export class CannotPinDefaultSpaceError extends Error {
  constructor(spaceId: string) {
    super(`Cannot pin or unpin the default space ${spaceId}`);
    this.name = 'CannotPinDefaultSpaceError';
  }
}
