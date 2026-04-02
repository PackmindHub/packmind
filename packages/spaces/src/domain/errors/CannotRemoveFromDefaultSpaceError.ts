export class CannotRemoveFromDefaultSpaceError extends Error {
  constructor(spaceId: string) {
    super(`Cannot remove members from default space ${spaceId}`);
    this.name = 'CannotRemoveFromDefaultSpaceError';
  }
}
