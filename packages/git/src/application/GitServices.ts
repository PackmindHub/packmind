import { GitProviderService } from './GitProviderService';
import { GitRepoService } from './GitRepoService';
import { GitCommitService } from './services/GitCommitService';
import { ResolvedGitRepoService } from './services/ResolvedGitRepoService';
import { instrumentComponents } from '@packmind/node-utils';
import { IGitRepositories } from '../domain/repositories/IGitRepositories';
import { IGitRepoFactory } from '../domain/repositories/IGitRepoFactory';

import { IOrganizationGitHubAppRepository } from '../domain/repositories/IOrganizationGitHubAppRepository';

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
  private readonly resolvedGitRepoService: ResolvedGitRepoService;

  constructor(private readonly gitRepositories: IGitRepositories) {
    // One per domain, so the reuse reaches across call sites. Built first:
    // GitProviderService resolves through it.
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

    // Services are where the domain logic that is not a query lives, and they
    // have no shared base class to hook - so the aggregator is the seam.
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
