/**
 * Error thrown when an endpoint is not available in the Community Edition.
 * This error should be caught and handled gracefully (exit 0 with a message).
 */
export class CommunityEditionError extends Error {
  constructor(feature: string) {
    super(
      `The "${feature}" feature is not available in Packmind Community Edition.`,
    );
    this.name = 'CommunityEditionError';
  }
}
