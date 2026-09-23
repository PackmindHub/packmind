import { StandardsError } from './StandardsError';

/**
 * The standard does not exist, or it belongs to another space than the one
 * asked for.
 *
 * One error for both, with one message, on purpose: a caller must not be
 * able to tell a standard outside their space from one that was never there.
 * The space id that was asked for is kept in the context, where only the log
 * sees it.
 */
export class StandardNotFoundError extends StandardsError {
  constructor(standardId: string, spaceId?: string) {
    super(
      'not_found',
      'standard_not_found',
      { standardId, ...(spaceId ? { spaceId } : {}) },
      'This standard does not exist, or you do not have access to it.',
    );
    this.name = 'StandardNotFoundError';
  }
}
