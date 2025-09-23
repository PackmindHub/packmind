import { IGitRepo } from './IGitRepo';
import { GitProvider } from '../entities/GitProvider';
import { GitRepo } from '../entities/GitRepo';

/**
 * IGitRepoFactory - Factory interface for creating IGitRepo instances
 *
 * This interface defines the contract for creating git repository instances
 * based on the provider type. It abstracts the instantiation logic from the
 * application layer, following the hexagonal architecture principle.
 */
export interface IGitRepoFactory {
  /**
   * Creates an IGitRepo instance based on the git provider configuration
   *
   * @param gitRepo - The git repository entity containing owner, repo, and branch
   * @param provider - The git provider entity containing source, token, and optional URL
   * @returns IGitRepo instance configured for the specific provider
   * @throws Error if the provider source is unsupported or configuration is invalid
   */
  createGitRepo(gitRepo: GitRepo, provider: GitProvider): IGitRepo;
}
