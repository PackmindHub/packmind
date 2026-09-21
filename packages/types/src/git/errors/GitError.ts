import { DomainError, DomainErrorKind } from '../../errors';

export type GitErrorReason =
  | 'git_repo_already_exists'
  | 'git_provider_not_found'
  | 'git_repo_not_found'
  | 'git_provider_has_repositories'
  | 'git_provider_missing_token'
  | 'git_provider_token_not_configured'
  | 'target_path_update_requires_token'
  | 'invalid_git_provider_credentials'
  | 'github_app_revoked'
  | 'git_provider_display_name_already_used'
  | 'git_provider_display_name_not_editable'
  | 'repository_already_tracked'
  | 'no_tracked_repository'
  | 'repository_not_trackable'
  | 'unsupported_git_provider'
  | 'missing_git_input'
  | 'no_files_to_commit'
  | 'unresolvable_git_provider'
  | 'git_repo_already_linked_as_standard'
  | 'invalid_install_state'
  | 'git_remote_access_forbidden';

export type GitErrorContext = {
  organizationId?: string;
  gitProviderId?: string;
  gitRepoId?: string;
  targetId?: string;
  owner?: string;
  repo?: string;
  branch?: string;
  displayName?: string;
  repositoryCount?: number;
  gitRemoteUrl?: string;
  field?: string;
  vendor?: string;
  action?: string;
};

/**
 * Base for the git domain errors, in the same shape as `DeploymentsError`:
 * the `kind` decides the HTTP answer, the literal `reason` is what a client
 * branches on, and `context` carries the ids for the log instead of only
 * being interpolated into the message.
 */
export class GitError extends Error implements DomainError {
  readonly kind: DomainErrorKind;
  readonly reason: GitErrorReason;
  readonly context: GitErrorContext;

  constructor(
    kind: DomainErrorKind,
    reason: GitErrorReason,
    context: GitErrorContext,
    message: string,
  ) {
    super(message);
    this.name = 'GitError';
    this.kind = kind;
    this.reason = reason;
    this.context = context;
  }
}
