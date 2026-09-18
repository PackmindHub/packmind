import { IGitRepo } from './IGitRepo';
import { GitProvider } from '@packmind/types';
import { GitRepo } from '@packmind/types';

export interface IGitRepoFactory {
  /**
   * @throws Error if the provider source is unsupported, or if the provider's
   * credentials cannot be resolved into an authenticated client — a missing
   * token, or GitHub App configuration that is absent or incomplete.
   * `GithubTokenResolverFactory` holds the specifics.
   * @throws GitHubAppRevokedError if the on-prem GitHub App bound to the
   * provider has been revoked.
   *
   * Anything that needs GitHub to answer — minting the App JWT, exchanging it
   * for an installation token, a 401 — surfaces on the returned repo's first
   * API call instead, never here.
   */
  createGitRepo(gitRepo: GitRepo, provider: GitProvider): Promise<IGitRepo>;
}
