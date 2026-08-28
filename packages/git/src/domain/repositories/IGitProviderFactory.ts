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

/**
 * IGitProviderFactory - Factory interface for creating IGitProvider instances
 *
 * This interface defines the contract for creating git provider instances
 * based on the provider type. It abstracts the instantiation logic from the
 * application layer, following the hexagonal architecture principle.
 */
export interface IGitProviderFactory {
  /**
   * Creates an IGitProvider instance based on the git provider configuration
   *
   * @param provider - The credentials containing source, token, and optional URL
   * @returns IGitProvider instance configured for the specific provider
   * @throws Error if the provider source is unsupported or configuration is invalid
   */
  createGitProvider(provider: GitProviderCredentials): Promise<IGitProvider>;
}
