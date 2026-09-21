import { PackmindInternalError } from '@packmind/types';

export type GitInternalErrorReason =
  | 'git_provider_source_not_configured'
  | 'git_repo_provider_not_configured'
  | 'directory_existence_check_failed'
  | 'available_remote_directories_failed'
  | 'git_adapter_ports_not_provided'
  | 'fetch_file_content_delayed_job_missing'
  | 'github_provider_token_empty'
  | 'github_app_provider_not_saved'
  | 'github_app_installation_id_missing'
  | 'github_app_installation_id_invalid'
  | 'github_app_id_not_configured'
  | 'github_app_private_key_not_configured'
  | 'github_app_repository_not_provided'
  | 'github_app_organization_app_id_missing'
  | 'github_organization_app_not_found'
  | 'github_app_id_invalid'
  | 'github_app_private_key_missing'
  | 'github_unsupported_auth_method'
  | 'gitlab_api_operation_failed'
  | 'gitlab_available_repositories_failed'
  | 'gitlab_branch_existence_check_failed'
  | 'gitlab_api_error_response'
  | 'gitlab_unexpected_response_format'
  | 'unsupported_git_provider_source'
  | 'fetch_file_content_queue_not_initialized'
  | 'fetch_file_content_delayed_job_not_created';

export type GitInternalErrorContext = {
  organizationId?: string;
  gitProviderId?: string;
  gitRepoId?: string;
  directoryPath?: string;
  branch?: string;
  operation?: string;
  owner?: string;
  repo?: string;
  authMethod?: string;
  appId?: string | number;
  installationId?: string | number;
  organizationGitHubAppId?: string;
  status?: number;
  projectPath?: string;
  source?: string;
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
