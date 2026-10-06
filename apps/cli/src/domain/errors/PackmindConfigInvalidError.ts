/**
 * Error thrown when packmind.json exists but cannot be parsed.
 * This error should be caught and handled with a user-friendly message.
 */
export class PackmindConfigInvalidError extends Error {
  constructor(public readonly directory: string) {
    super(
      `packmind.json in ${directory} exists but could not be parsed. Please fix the JSON syntax errors and try again.`,
    );
    this.name = 'PackmindConfigInvalidError';
  }
}
