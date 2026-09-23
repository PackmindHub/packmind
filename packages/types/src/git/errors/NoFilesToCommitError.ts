import { GitError } from './GitError';

/**
 * A commit command with an empty file set. Nothing about the stored state
 * makes it fail — the command is malformed on its face — so it is the
 * caller's to correct.
 */
export class NoFilesToCommitError extends GitError {
  constructor() {
    super('invalid_input', 'no_files_to_commit', {}, 'No files to commit');
    this.name = 'NoFilesToCommitError';
  }
}
