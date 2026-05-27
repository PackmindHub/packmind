import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  IListInstallationRepositoriesUseCase,
  ListInstallationRepositoriesCommand,
  ListInstallationRepositoriesResponse,
  NoGitHubAppRegisteredError,
  NotAGitHubAppProviderError,
} from '@packmind/types';
import { IGitHubAppConfigRepository } from '../../../../domain/repositories/IGitHubAppConfigRepository';
import { GitProviderService } from '../../../GitProviderService';
import { GithubAppInstallationRepositoriesFetcher } from '../../../services/GithubAppInstallationRepositoriesFetcher';
import { GithubAppTokenService } from '../../../services/GithubAppTokenService';

const origin = 'ListInstallationRepositoriesUseCase';

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
    private readonly installationRepositoriesFetcher: GithubAppInstallationRepositoriesFetcher,
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

    const repositories =
      await this.installationRepositoriesFetcher.fetchAll(installationToken);

    this.logger.info('Installation repositories listed successfully', {
      gitProviderId,
      count: repositories.length,
    });

    return { repositories };
  }
}
