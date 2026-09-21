import { GitError } from './GitError';
import { GitRemoteVendorLabel } from './GitRemoteAccessForbiddenError';

/**
 * The provider answered 404 for a repository — or for a branch inside one.
 * A 404 from a git host is genuinely ambiguous: the path may be wrong, or
 * the token may simply not be allowed to see what is there, since a host
 * that hid a private repository behind a 404 would not admit to it. Both
 * readings are the caller's to check, so it is a domain `not_found` and the
 * message names both remedies rather than pretending to know which applies.
 *
 * One class and one message for every 404 site: `branch` is appended only
 * where the call named one, so the two near-duplicate sentences the call
 * sites used to build become a single sentence with an optional clause.
 */
export class GitRemoteRepositoryNotFoundError extends GitError {
  constructor(
    vendor: GitRemoteVendorLabel,
    owner: string,
    repo: string,
    branch?: string,
  ) {
    super(
      'not_found',
      'git_remote_repository_not_found',
      branch ? { vendor, owner, repo, branch } : { vendor, owner, repo },
      `The ${vendor} repository ${owner}/${repo}${
        branch ? ` or its branch '${branch}'` : ''
      } was not found. Check that the path is correct and that the connection's token has access to it.`,
    );
    this.name = 'GitRemoteRepositoryNotFoundError';
  }
}
