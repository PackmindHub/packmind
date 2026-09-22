import { GitError } from './GitError';

/** The provider's display name, as it should read in the message. */
export type GitRemoteVendorLabel = 'GitHub' | 'GitLab';

/**
 * The provider refused an operation on a repository: the token we hold is
 * valid, it is simply not allowed to do this here. That is the caller's to
 * correct — widen the grant, or reconnect with a token that has it — so it
 * is a domain `forbidden`, not an upstream failure and not ours.
 *
 * One message across vendors and operations, because the remedy is the same
 * one everywhere: `action` names what the token was missing ('write',
 * 'read', 'push') so the reader knows which scope to look for.
 *
 * On GitHub this is only reached once a throttle has been ruled out —
 * GitHub answers 403 for both, and `detectGithubRateLimit` is what tells
 * them apart.
 */
export class GitRemoteAccessForbiddenError extends GitError {
  constructor(
    vendor: GitRemoteVendorLabel,
    owner: string,
    repo: string,
    action: string,
  ) {
    super(
      'forbidden',
      'git_remote_access_forbidden',
      { vendor, owner, repo, action },
      `Access to the ${vendor} repository ${owner}/${repo} was refused. Check that the connection's token has ${action} access.`,
    );
    this.name = 'GitRemoteAccessForbiddenError';
  }
}
