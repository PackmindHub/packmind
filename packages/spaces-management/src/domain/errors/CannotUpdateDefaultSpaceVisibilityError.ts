export class CannotUpdateDefaultSpaceVisibilityError extends Error {
  constructor(spaceId: string) {
    super(`Cannot update visibility of default space ${spaceId}`);
    this.name = 'CannotUpdateDefaultSpaceVisibilityError';
  }
}
