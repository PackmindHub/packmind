import { GitProviderService } from './GitProviderService';
import { GitRepoService } from './GitRepoService';
import { GitCommitService } from './services/GitCommitService';
import { IGitRepositories } from '../domain/repositories/IGitRepositories';
import { IGitRepoFactory } from '../domain/repositories/IGitRepoFactory';
import { IGitProviderFactory } from '../domain/repositories/IGitProviderFactory';

/**
 * GitServices - Service aggregator for the Git application layer
 *
 * This class serves as the main service access point, aggregating all
 * individual services. It handles the instantiation of services
 * using the repository aggregator and provides them through getter methods.
 */
export class GitServices {
  private readonly gitProviderService: GitProviderService;
  private readonly gitRepoService: GitRepoService;
  private readonly gitCommitService: GitCommitService;

  constructor(private readonly gitRepositories: IGitRepositories) {
    // Initialize all services with their respective repositories from the aggregator
    this.gitProviderService = new GitProviderService(
      this.gitRepositories.getGitProviderRepository(),
      this.gitRepositories.getGitProviderFactory(),
      this.gitRepositories.getGitRepoFactory(),
    );
    this.gitRepoService = new GitRepoService(
      this.gitRepositories.getGitRepoRepository(),
    );
    this.gitCommitService = new GitCommitService(
      this.gitRepositories.getGitCommitRepository(),
    );
  }

  getGitProviderService(): GitProviderService {
    return this.gitProviderService;
  }

  getGitRepoService(): GitRepoService {
    return this.gitRepoService;
  }

  getGitCommitService(): GitCommitService {
    return this.gitCommitService;
  }

  getGitRepoFactory(): IGitRepoFactory {
    return this.gitRepositories.getGitRepoFactory();
  }

  getGitProviderFactory(): IGitProviderFactory {
    return this.gitRepositories.getGitProviderFactory();
  }
}
