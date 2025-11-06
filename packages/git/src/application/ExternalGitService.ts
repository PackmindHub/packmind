import { GitProvider } from '../domain/entities/GitProvider';
import { IGitProviderFactory } from '../domain/repositories/IGitProviderFactory';
import { PackmindLogger } from '@packmind/logger';

export interface ExternalRepository {
  name: string;
  owner: string;
  description?: string;
  private: boolean;
  defaultBranch: string;
  language?: string;
  stars: number;
}

export class ExternalGitService {
  constructor(
    private readonly gitProviderFactory: IGitProviderFactory,
    private readonly logger: PackmindLogger,
  ) {}

  async listAvailableRepositories(
    gitProvider: GitProvider,
  ): Promise<ExternalRepository[]> {
    const provider = this.createGitProviderInstance(gitProvider);
    return provider.listAvailableRepositories();
  }

  async checkBranchExists(
    gitProvider: GitProvider,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<boolean> {
    const provider = this.createGitProviderInstance(gitProvider);
    return provider.checkBranchExists(owner, repo, branch);
  }

  private createGitProviderInstance(gitProvider: GitProvider) {
    return this.gitProviderFactory.createGitProvider(gitProvider);
  }
}
