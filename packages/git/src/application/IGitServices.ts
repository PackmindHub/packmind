import { GitProviderService } from './GitProviderService';
import { GitRepoService } from './GitRepoService';
import { GitCommitService } from './services/GitCommitService';
import { IGitRepoFactory } from '../domain/repositories/IGitRepoFactory';
import { IGitProviderFactory } from '../domain/repositories/IGitProviderFactory';

/**
 * IGitServices - Service aggregator interface for the Git application layer
 *
 * This interface serves as the main service access point, aggregating all
 * individual services through getter methods. This pattern centralizes
 * service instantiation and provides a clean dependency injection point.
 */
export interface IGitServices {
  /**
   * Get the git provider service instance
   */
  getGitProviderService(): GitProviderService;

  /**
   * Get the git repo service instance
   */
  getGitRepoService(): GitRepoService;

  /**
   * Get the git commit service instance
   */
  getGitCommitService(): GitCommitService;

  /**
   * Get the git repo factory instance
   */
  getGitRepoFactory(): IGitRepoFactory;

  /**
   * Get the git provider factory instance
   */
  getGitProviderFactory(): IGitProviderFactory;
}
