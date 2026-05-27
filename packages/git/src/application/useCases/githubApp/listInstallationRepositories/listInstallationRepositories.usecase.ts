import axios from 'axios';
import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  IListInstallationRepositoriesUseCase,
  InstallationRepository,
  ListInstallationRepositoriesCommand,
  ListInstallationRepositoriesResponse,
  NoGitHubAppRegisteredError,
  NotAGitHubAppProviderError,
} from '@packmind/types';
import { IGitHubAppConfigRepository } from '../../../../domain/repositories/IGitHubAppConfigRepository';
import { GitProviderService } from '../../../GitProviderService';
import { GithubAppTokenService } from '../../../services/GithubAppTokenService';

const origin = 'ListInstallationRepositoriesUseCase';

type GitHubRepo = {
  name: string;
  full_name: string;
  owner: { login: string };
  default_branch: string;
  private: boolean;
  description: string | null;
};

type GitHubInstallationRepositoriesResponse = {
  total_count: number;
  repositories: GitHubRepo[];
};

export class ListInstallationRepositoriesUseCase
  extends AbstractMemberUseCase<
    ListInstallationRepositoriesCommand,
    ListInstallationRepositoriesResponse
  >
  implements IListInstallationRepositoriesUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly gitHubAppConfigRepository: IGitHubAppConfigRepository,
    private readonly githubAppTokenService: GithubAppTokenService,
    private readonly gitProviderService: GitProviderService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: ListInstallationRepositoriesCommand & MemberContext,
  ): Promise<ListInstallationRepositoriesResponse> {
    const { gitProviderId } = command;

    this.logger.info('Listing installation repositories', { gitProviderId });

    const gitProvider =
      await this.gitProviderService.findGitProviderById(gitProviderId);

    if (!gitProvider) {
      throw new Error('Git provider not found');
    }

    if (gitProvider.organizationId !== command.organization.id) {
      throw new Error('Git provider not found');
    }

    if (
      gitProvider.authType !== 'github_app' ||
      gitProvider.githubAppInstallationId == null
    ) {
      throw new NotAGitHubAppProviderError(gitProviderId);
    }

    const config = await this.gitHubAppConfigRepository.findActive();
    if (!config) {
      throw new NoGitHubAppRegisteredError();
    }

    const installationToken =
      await this.githubAppTokenService.getInstallationToken(
        config,
        gitProvider.githubAppInstallationId,
      );

    const repositories = await this.paginateRepositories(installationToken);

    this.logger.info('Installation repositories listed successfully', {
      gitProviderId,
      count: repositories.length,
    });

    return { repositories };
  }

  private async paginateRepositories(
    installationToken: string,
  ): Promise<InstallationRepository[]> {
    const allRepositories: InstallationRepository[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const { data } = await axios.get<GitHubInstallationRepositoriesResponse>(
        `https://api.github.com/installation/repositories?per_page=${perPage}&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${installationToken}`,
            Accept: 'application/vnd.github+json',
          },
        },
      );

      const mapped: InstallationRepository[] = data.repositories.map(
        (repo) => ({
          owner: repo.owner.login,
          name: repo.name,
          fullName: repo.full_name,
          defaultBranch: repo.default_branch,
          private: repo.private,
          description: repo.description,
        }),
      );

      allRepositories.push(...mapped);

      if (data.repositories.length < perPage) {
        break;
      }

      page++;
    }

    return allRepositories;
  }
}
