import { GitError, GitErrorContext } from './GitError';

/**
 * The provider accepted the commit but had nothing to write: the files already
 * match. Deployment flows catch it and record `no_changes` rather than a
 * failure, matching it by `instanceof` — never by its message.
 */
export class NoChangesDetectedError extends GitError {
  constructor(context: GitErrorContext = {}) {
    super(
      'conflict',
      'no_changes_detected',
      context,
      'The files already match; there was nothing to commit.',
    );
    this.name = 'NoChangesDetectedError';
  }
}
