/**
 * Error thrown when a command needs a packmind.json in a directory that has
 * none. This error should be caught and handled with a user-friendly message.
 */
export class PackmindConfigNotFoundError extends Error {
  constructor(public readonly directory: string) {
    super(`No packmind.json found in ${directory}.`);
    this.name = 'PackmindConfigNotFoundError';
  }
}
