import { PackmindInternalError } from '@packmind/types';

export type GitInternalErrorReason = 'git_provider_source_not_configured';

export type GitInternalErrorContext = {
  gitProviderId?: string;
  gitRepoId?: string;
};

/**
 * Base for the git broken invariants, in the same shape as `GitError` but on
 * the internal side: no `kind` to choose — it is always 500, logged with its
 * stack and with its message withheld from the client — a literal `reason`
 * union naming the invariant and a typed `context` carrying the ids.
 *
 * These stay inside the package: unlike the domain errors in
 * `@packmind/types`, nothing outside `git` branches on them.
 */
export class GitInternalError extends PackmindInternalError {
  constructor(
    reason: GitInternalErrorReason,
    context: GitInternalErrorContext,
    message: string,
  ) {
    super(reason, context, message);
    this.name = 'GitInternalError';
  }
}
