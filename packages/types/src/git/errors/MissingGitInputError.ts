import { GitError } from './GitError';

/**
 * A required field of a git command is absent. One class for every such
 * guard rather than one per field: the failure is the same — the command is
 * malformed on its face, independent of any stored state — and the field
 * that was missing belongs in the context, not in a class name.
 */
export class MissingGitInputError extends GitError {
  constructor(public readonly field: string) {
    super(
      'invalid_input',
      'missing_git_input',
      { field },
      `${field} is required`,
    );
    this.name = 'MissingGitInputError';
  }
}
