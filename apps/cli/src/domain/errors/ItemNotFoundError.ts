/**
 * Error thrown when an item (package, standard, command, or skill) is not found.
 * This error should be caught and handled with a user-friendly message.
 */
export class ItemNotFoundError extends Error {
  constructor(
    public readonly itemType: string,
    public readonly slug: string,
    public readonly spaceSlug?: string,
  ) {
    const message = spaceSlug
      ? `${itemType} '${slug}' not found in space '@${spaceSlug}'`
      : `${itemType} '${slug}' not found`;
    super(message);
    this.name = 'ItemNotFoundError';
  }
}
