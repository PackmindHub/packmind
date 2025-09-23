import { IGitProvider } from './IGitProvider';
import { GitProvider } from '../entities/GitProvider';

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
   * @param provider - The git provider entity containing source, token, and optional URL
   * @returns IGitProvider instance configured for the specific provider
   * @throws Error if the provider source is unsupported or configuration is invalid
   */
  createGitProvider(provider: GitProvider): IGitProvider;
}
