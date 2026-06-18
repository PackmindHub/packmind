/**
 * Error thrown when the Git provider token bound to a marketplace's git
 * repo is missing, expired, or otherwise rejected by the provider.
 *
 * The token itself is never echoed in the message or in logs — the
 * user-facing copy is the constant in this class and downstream code MUST
 * NOT include token bytes when rethrowing or logging.
 */
export class GitProviderTokenInvalidError extends Error {
  /**
   * Exact verbatim user-facing message defined by the feature spec.
   * Do not modify without coordinating with the spec / docs.
   */
  public static readonly USER_FACING_MESSAGE =
    'The package could not be published. Reason: Invalid or expired Git token.';

  constructor() {
    super(GitProviderTokenInvalidError.USER_FACING_MESSAGE);
    this.name = 'GitProviderTokenInvalidError';
  }
}
