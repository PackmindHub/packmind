import { DataSource } from 'typeorm';
import { IGitRepositories } from '../../domain/repositories/IGitRepositories';
import { IGitProviderRepository } from '../../domain/repositories/IGitProviderRepository';
import { IGitRepoRepository } from '../../domain/repositories/IGitRepoRepository';
import { IGitCommitRepository } from '../../domain/repositories/IGitCommitRepository';
import { GitProviderRepository } from './GitProviderRepository';
import { GitRepoRepository } from './GitRepoRepository';
import { GitCommitRepository } from './GitCommitRepository';
import { GitProviderSchema } from '../schemas/GitProviderSchema';
import { GitRepoSchema } from '../schemas/GitRepoSchema';
import { GitCommitSchema } from '../schemas/GitCommitSchema';

/**
 * GitRepositories - Repository aggregator implementation for the Git domain
 *
 * This class serves as the main repository access point, aggregating all
 * individual repositories. It handles the instantiation of repositories
 * using the shared DataSource and provides them through getter methods.
 */
export class GitRepositories implements IGitRepositories {
  private readonly gitProviderRepository: IGitProviderRepository;
  private readonly gitRepoRepository: IGitRepoRepository;
  private readonly gitCommitRepository: IGitCommitRepository;

  constructor(private readonly dataSource: DataSource) {
    // Initialize all repositories with their respective schemas
    this.gitProviderRepository = new GitProviderRepository(
      this.dataSource.getRepository(GitProviderSchema),
    );
    this.gitRepoRepository = new GitRepoRepository(
      this.dataSource.getRepository(GitRepoSchema),
    );
    this.gitCommitRepository = new GitCommitRepository(
      this.dataSource.getRepository(GitCommitSchema),
    );
  }

  getGitProviderRepository(): IGitProviderRepository {
    return this.gitProviderRepository;
  }

  getGitRepoRepository(): IGitRepoRepository {
    return this.gitRepoRepository;
  }

  getGitCommitRepository(): IGitCommitRepository {
    return this.gitCommitRepository;
  }
}
