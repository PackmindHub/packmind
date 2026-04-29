export class CannotRenameDefaultSpaceError extends Error {
  constructor(spaceId: string) {
    super(`Cannot rename the default space ${spaceId}`);
    this.name = 'CannotRenameDefaultSpaceError';
  }
}
