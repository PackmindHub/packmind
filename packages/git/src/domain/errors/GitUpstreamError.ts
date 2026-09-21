import { PackmindUpstreamError, UpstreamErrorKind } from '@packmind/types';

export type GitUpstreamErrorReason =
  | 'github_api_operation_failed'
  | 'github_available_repositories_failed'
  | 'github_branch_existence_check_failed'
  | 'github_app_token_exchange_failed'
  | 'github_access_token_response_incomplete'
  | 'github_access_token_expiry_unparseable'
  | 'github_rate_limited';

export type GitUpstreamErrorContext = {
  organizationId?: string;
  gitProviderId?: string;
  gitRepoId?: string;
  branch?: string;
  operation?: string;
  owner?: string;
  repo?: string;
  installationId?: string | number;
  expiresAt?: string;
  status?: number;
  projectPath?: string;
};

/**
 * Base for the git failures that belong to the provider rather than to us:
 * GitHub or GitLab refused, went away, or handed back something we cannot
 * read. Same shape as `GitInternalError` — a literal `reason` union and a
 * typed `context` — plus the `kind` the sibling base needs, because an
 * upstream failure is either unavailable (502) or a throttle (429), and
 * `retryAfterSeconds` when the provider said how long to wait.
 *
 * Like `GitInternalError` these stay inside the package: nothing outside
 * `git` branches on them, only on the `kind` the filter reads.
 */
export class GitUpstreamError extends PackmindUpstreamError {
  constructor(
    kind: UpstreamErrorKind,
    reason: GitUpstreamErrorReason,
    context: GitUpstreamErrorContext,
    message: string,
    retryAfterSeconds?: number,
  ) {
    super(kind, reason, context, message, retryAfterSeconds);
    this.name = 'GitUpstreamError';
  }
}
