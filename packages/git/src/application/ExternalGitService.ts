import { GitProvider } from '@packmind/types';
import { IGitProvider } from '../domain/repositories/IGitProvider';
import { IGitProviderFactory } from '../domain/repositories/IGitProviderFactory';
import { PackmindLogger } from '@packmind/logger';

const origin = 'ExternalGitService';

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
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async listAvailableRepositories(
    gitProvider: GitProvider,
  ): Promise<ExternalRepository[]> {
    const provider = await this.createGitProviderInstance(gitProvider);
    return provider.listAvailableRepositories();
  }

  async checkBranchExists(
    gitProvider: GitProvider,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<boolean> {
    const provider = await this.createGitProviderInstance(gitProvider);
    return provider.checkBranchExists(owner, repo, branch);
  }

  private createGitProviderInstance(
    gitProvider: GitProvider,
  ): Promise<IGitProvider> {
    return this.gitProviderFactory.createGitProvider(gitProvider);
  }
}
