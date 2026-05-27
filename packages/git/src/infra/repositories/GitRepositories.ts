import { DataSource } from 'typeorm';
import { IGitRepositories } from '../../domain/repositories/IGitRepositories';
import { IGitProviderRepository } from '../../domain/repositories/IGitProviderRepository';
import { IGitRepoRepository } from '../../domain/repositories/IGitRepoRepository';
import { IGitCommitRepository } from '../../domain/repositories/IGitCommitRepository';
import { IGitRepoFactory } from '../../domain/repositories/IGitRepoFactory';
import { IGitProviderFactory } from '../../domain/repositories/IGitProviderFactory';
import { GitProviderRepository } from './GitProviderRepository';
import { GitRepoRepository } from './GitRepoRepository';
import { GitCommitRepository } from './GitCommitRepository';
import { GitRepoFactory } from './GitRepoFactory';
import { GitProviderFactory } from './GitProviderFactory';
import { GitHubAppConfigRepository } from './GitHubAppConfigRepository';
import { GitProviderSchema } from '../schemas/GitProviderSchema';
import { GitRepoSchema } from '../schemas/GitRepoSchema';
import { GitCommitSchema } from '../schemas/GitCommitSchema';
import { GitHubAppConfigSchema } from '../schemas/GitHubAppConfigSchema';
import { GitHexaOpts } from '../../GitHexa';

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
  private readonly gitRepoFactory: IGitRepoFactory;
  private readonly gitProviderFactory: IGitProviderFactory;
  private readonly _gitHubAppConfigRepository: GitHubAppConfigRepository;

  constructor(
    private readonly dataSource: DataSource,
    opts: GitHexaOpts,
  ) {
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

    // Initialize the factories
    this.gitRepoFactory = opts?.gitRepoFactory ?? new GitRepoFactory();
    this._gitHubAppConfigRepository = new GitHubAppConfigRepository(
      this.dataSource.getRepository(GitHubAppConfigSchema),
    );
    this.gitProviderFactory = new GitProviderFactory(
      this._gitHubAppConfigRepository,
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

  getGitRepoFactory(): IGitRepoFactory {
    return this.gitRepoFactory;
  }

  getGitProviderFactory(): IGitProviderFactory {
    return this.gitProviderFactory;
  }

  getGitHubAppConfigRepository(): GitHubAppConfigRepository {
    return this._gitHubAppConfigRepository;
  }
}
