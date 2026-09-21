import { PackmindInternalError } from '@packmind/types';

export type GitInternalErrorReason =
  | 'git_provider_source_not_configured'
  | 'git_repo_provider_not_configured'
  | 'directory_existence_check_failed'
  | 'available_remote_directories_failed';

export type GitInternalErrorContext = {
  organizationId?: string;
  gitProviderId?: string;
  gitRepoId?: string;
  directoryPath?: string;
  branch?: string;
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
