import { IGitProviderRepository } from './IGitProviderRepository';
import { IGitRepoRepository } from './IGitRepoRepository';
import { IGitCommitRepository } from './IGitCommitRepository';
import { IGitRepoFactory } from './IGitRepoFactory';
import { IGitProviderFactory } from './IGitProviderFactory';

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

  /**
   * Get the git repo factory instance
   */
  getGitRepoFactory(): IGitRepoFactory;

  /**
   * Get the git provider factory instance
   */
  getGitProviderFactory(): IGitProviderFactory;
}
