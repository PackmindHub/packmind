import { IGitProvider } from './IGitProvider';
import { GitProvider } from '@packmind/types';

/**
 * The provider fields instantiation actually reads. Narrower than `GitProvider`
 * on purpose: a candidate credential set being verified before it is saved has
 * no id and no organizationId yet, and requiring them would force callers to
 * invent values the factory never looks at. Every `GitProvider` satisfies it.
 */
export type GitProviderCredentials = Pick<
  GitProvider,
  | 'source'
  | 'token'
  | 'url'
  | 'authMethod'
  | 'appInstallationId'
  | 'organizationGitHubAppId'
> & {
  /**
   * Absent only for a candidate that has not been saved yet. Token auth never
   * reads it, but GitHub App auth mints its installation token against the
   * provider's identity and therefore requires a persisted row.
   */
  id?: GitProvider['id'];
};

export interface IGitProviderFactory {
  /**
   * @throws Error if the provider source is unsupported, or if the credentials
   * cannot be resolved into an authenticated client — a missing token, an
   * unsaved provider under App auth, or GitHub App configuration that is
   * absent or incomplete. `GithubTokenResolverFactory` holds the specifics.
   * @throws GitHubAppRevokedError if the on-prem GitHub App bound to the
   * provider has been revoked.
   *
   * Anything that needs GitHub to answer — minting the App JWT, exchanging it
   * for an installation token, a 401 — surfaces on the returned provider's
   * first API call instead, never here.
   */
  createGitProvider(provider: GitProviderCredentials): Promise<IGitProvider>;
}
