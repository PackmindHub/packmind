import { GitError, GitErrorContext } from './GitError';

/**
 * The provider accepted the commit but had nothing to write: the files already
 * match. Deployment flows catch it and record `no_changes` rather than a
 * failure.
 *
 * The message is the old sentinel string on purpose: callers outside this
 * repo still match on `error.message === 'NO_CHANGES_DETECTED'`.
 */
export class NoChangesDetectedError extends GitError {
  constructor(context: GitErrorContext = {}) {
    super('conflict', 'no_changes_detected', context, 'NO_CHANGES_DETECTED');
    this.name = 'NoChangesDetectedError';
  }
}
