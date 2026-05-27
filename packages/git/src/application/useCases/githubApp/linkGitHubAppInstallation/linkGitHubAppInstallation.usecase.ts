import axios from 'axios';
import { PackmindLogger } from '@packmind/logger';
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';
import {
  GitHubInstallationNotFoundError,
  GitProvider,
  IAccountsPort,
  ILinkGitHubAppInstallationUseCase,
  InstallationAccount,
  LinkGitHubAppInstallationCommand,
  LinkGitHubAppInstallationResponse,
  NoGitHubAppRegisteredError,
} from '@packmind/types';
import { IGitHubAppConfigRepository } from '../../../../domain/repositories/IGitHubAppConfigRepository';
import { GitProviderService } from '../../../GitProviderService';
import { GithubAppTokenService } from '../../../services/GithubAppTokenService';

const origin = 'LinkGitHubAppInstallationUseCase';

type GitHubInstallationResponse = {
  account: {
    login: string;
    type: string;
  };
  target_type: string;
  repository_selection: string;
};

export class LinkGitHubAppInstallationUseCase
  extends AbstractAdminUseCase<
    LinkGitHubAppInstallationCommand,
    LinkGitHubAppInstallationResponse
  >
  implements ILinkGitHubAppInstallationUseCase
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

  protected async executeForAdmins(
    command: LinkGitHubAppInstallationCommand & AdminContext,
  ): Promise<LinkGitHubAppInstallationResponse> {
    const { installationId } = command;

    this.logger.info('Linking GitHub App installation', { installationId });

    const config = await this.gitHubAppConfigRepository.findActive();
    if (!config) {
      throw new NoGitHubAppRegisteredError();
    }

    const appJwt = this.githubAppTokenService.generateAppJwt(config);

    let installationData: GitHubInstallationResponse;
    try {
      const { data } = await axios.get<GitHubInstallationResponse>(
        `https://api.github.com/app/installations/${installationId}`,
        {
          headers: {
            Authorization: `Bearer ${appJwt}`,
            Accept: 'application/vnd.github+json',
          },
        },
      );
      installationData = data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new GitHubInstallationNotFoundError(installationId);
      }
      throw error;
    }

    const installationAccount: InstallationAccount = {
      login: installationData.account.login,
      type: installationData.account.type,
      targetType: installationData.target_type,
      repositorySelection: installationData.repository_selection,
    };

    const providers =
      await this.gitProviderService.findGitProvidersByOrganizationId(
        command.organization.id,
      );

    const existingAppProvider = providers.find(
      (p) => p.source === 'github' && p.authType === 'github_app',
    );

    let gitProvider: GitProvider;

    if (existingAppProvider) {
      this.logger.debug('Updating existing GitHub App provider', {
        providerId: existingAppProvider.id,
      });
      gitProvider = await this.gitProviderService.updateGitProvider(
        existingAppProvider.id,
        { githubAppInstallationId: installationId },
      );
    } else {
      this.logger.debug('Creating new GitHub App provider for organization');
      gitProvider = await this.gitProviderService.addGitProvider({
        source: 'github',
        authType: 'github_app',
        token: null,
        url: 'https://api.github.com',
        githubAppInstallationId: installationId,
        organizationId: command.organization.id,
      });
    }

    this.logger.info('GitHub App installation linked successfully', {
      installationId,
      providerId: gitProvider.id,
    });

    return { gitProvider, installationAccount };
  }
}
