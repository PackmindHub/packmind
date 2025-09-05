import { IGitProviderRepository } from './IGitProviderRepository';
import { IGitRepoRepository } from './IGitRepoRepository';
import { IGitCommitRepository } from './IGitCommitRepository';

/**
 * IGitRepositories - Repository aggregator interface for the Git domain
 *
 * This interface serves as the main repository access point, aggregating all
 * individual repositories through getter methods. This pattern centralizes
 * repository instantiation and provides a clean dependency injection point.
 */
export interface IGitRepositories {
  /**
   * Get the git provider repository instance
   */
  getGitProviderRepository(): IGitProviderRepository;

  /**
   * Get the git repo repository instance
   */
  getGitRepoRepository(): IGitRepoRepository;

  /**
   * Get the git commit repository instance
   */
  getGitCommitRepository(): IGitCommitRepository;
}
