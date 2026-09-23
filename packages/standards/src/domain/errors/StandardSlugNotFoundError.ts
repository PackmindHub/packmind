import { StandardsError } from './StandardsError';

/**
 * No standard answers to this slug in the organization, or the one that does
 * sits in another space than the one asked for.
 *
 * One error for both, with one message, on purpose: a caller must not be
 * able to tell a standard outside their space from one that was never there.
 * The slug and space asked for are kept in the context.
 *
 * Kept apart from `StandardNotFoundError` because the slug is what the caller
 * typed, often an agent through MCP, and the message tells it where to look
 * for the right one.
 */
export class StandardSlugNotFoundError extends StandardsError {
  constructor(standardSlug: string, spaceId?: string) {
    super(
      'not_found',
      'standard_not_found',
      { standardSlug, ...(spaceId ? { spaceId } : {}) },
      'Standard slug not found, please check current standards first',
    );
    this.name = 'StandardSlugNotFoundError';
  }
}
