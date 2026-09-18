import { GitProviderService } from './GitProviderService';
import { GitRepoService } from './GitRepoService';
import { GitCommitService } from './services/GitCommitService';
import { ResolvedGitRepoService } from './services/ResolvedGitRepoService';
import { instrumentComponents } from '@packmind/node-utils';
import { IGitRepositories } from '../domain/repositories/IGitRepositories';
import { IGitRepoFactory } from '../domain/repositories/IGitRepoFactory';

import { IOrganizationGitHubAppRepository } from '../domain/repositories/IOrganizationGitHubAppRepository';

export class GitServices {
  private readonly gitProviderService: GitProviderService;
  private readonly gitRepoService: GitRepoService;
  private readonly gitCommitService: GitCommitService;
  private readonly resolvedGitRepoService: ResolvedGitRepoService;

  constructor(private readonly gitRepositories: IGitRepositories) {
    // Built first: GitProviderService resolves through it.
    this.resolvedGitRepoService = new ResolvedGitRepoService(
      this.gitRepositories.getGitProviderRepository(),
      this.gitRepositories.getGitRepoFactory(),
    );
    this.gitProviderService = new GitProviderService(
      this.gitRepositories.getGitProviderRepository(),
      this.gitRepositories.getGitProviderFactory(),
      this.resolvedGitRepoService,
    );
    this.gitRepoService = new GitRepoService(
      this.gitRepositories.getGitRepoRepository(),
    );
    this.gitCommitService = new GitCommitService(
      this.gitRepositories.getGitCommitRepository(),
    );

    // Services have no shared base class to hook, so the aggregator is the
    // only seam where all of them can be instrumented at once.
    instrumentComponents([
      this.gitProviderService,
      this.gitRepoService,
      this.gitCommitService,
      this.resolvedGitRepoService,
    ]);
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

  getResolvedGitRepoService(): ResolvedGitRepoService {
    return this.resolvedGitRepoService;
  }

  getGitRepoFactory(): IGitRepoFactory {
    return this.gitRepositories.getGitRepoFactory();
  }

  getOrganizationGitHubAppRepository(): IOrganizationGitHubAppRepository {
    return this.gitRepositories.getOrganizationGitHubAppRepository();
  }
}
