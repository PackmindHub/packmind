import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { AccountsHexa } from '@packmind/accounts';
import {
  AddGitProviderCommand,
  ClientSource,
  GitProvider,
  GitProviderId,
  GitRepo,
  GitRepoId,
  IGitPort,
  ListProvidersCommand,
  ListProvidersResponse,
  OrganizationId,
  UserId,
} from '@packmind/types';
import { InjectGitAdapter } from '../../../shared/HexaInjection';
import { Configuration } from '@packmind/node-utils';
import { InvalidInstallStateError, InstallStateSigner } from '@packmind/git';
import { INSTALL_STATE_SIGNER } from './git-providers.tokens';

type BuildGithubAppInstallUrlCommand = {
  organizationId: OrganizationId;
  userId: UserId;
};

type BuildGithubAppInstallUrlResponse = {
  installUrl: string;
  state: string;
};

type CompleteGithubAppInstallCommand = {
  organizationId: OrganizationId;
  userId: UserId;
  installationId: number;
  state: string;
  source: ClientSource;
};

@Injectable()
export class GitProvidersService {
  constructor(
    @InjectGitAdapter() private readonly gitAdapter: IGitPort,
    private readonly accountsHexa: AccountsHexa,
    @Inject(INSTALL_STATE_SIGNER)
    private readonly signer: InstallStateSigner,
  ) {}

  async addGitProvider(
    userId: UserId,
    organizationId: OrganizationId,
    gitProvider: Omit<GitProvider, 'id'>,
    source: ClientSource,
  ): Promise<GitProvider> {
    const command: AddGitProviderCommand = {
      userId: String(userId),
      organizationId: String(organizationId),
      gitProvider,
      // False for token-method providers; the App-installation flow uses its own
      // `completeGithubAppInstall` method which sets this true because no PAT
      // is captured at install time.
      allowTokenlessProvider: false,
      source,
    };

    return this.gitAdapter.addGitProvider(command);
  }

  async buildGithubAppInstallUrl(
    command: BuildGithubAppInstallUrlCommand,
  ): Promise<BuildGithubAppInstallUrlResponse> {
    const slug = await Configuration.getConfig('GITHUB_APP_SLUG');
    if (!slug) {
      throw new InternalServerErrorException(
        'GITHUB_APP_SLUG is not configured',
      );
    }

    const state = this.signer.sign({
      orgId: String(command.organizationId),
      userId: String(command.userId),
    });

    const installUrl =
      'https://github.com/apps/' +
      encodeURIComponent(slug) +
      '/installations/new?state=' +
      encodeURIComponent(state);

    return { installUrl, state };
  }

  async completeGithubAppInstall(
    command: CompleteGithubAppInstallCommand,
  ): Promise<GitProvider> {
    let payload;
    try {
      payload = this.signer.verify(command.state);
    } catch (error) {
      if (error instanceof InvalidInstallStateError) {
        throw new BadRequestException('Invalid or expired state token');
      }
      throw error;
    }

    if (payload.orgId !== String(command.organizationId)) {
      throw new BadRequestException('Invalid or expired state token');
    }

    if (payload.userId !== String(command.userId)) {
      throw new BadRequestException('Invalid or expired state token');
    }

    if (
      !Number.isInteger(command.installationId) ||
      command.installationId <= 0 ||
      command.installationId > Number.MAX_SAFE_INTEGER
    ) {
      throw new BadRequestException(
        'installationId must be a positive integer',
      );
    }

    const addCommand: AddGitProviderCommand = {
      userId: String(command.userId),
      organizationId: String(command.organizationId),
      gitProvider: {
        source: 'github',
        authMethod: 'app',
        appInstallationId: command.installationId,
        url: null,
        token: null,
      },
      allowTokenlessProvider: true,
      source: command.source,
    };

    return this.gitAdapter.addGitProvider(addCommand);
  }

  async addRepositoryToProvider(
    userId: UserId,
    organizationId: OrganizationId,
    gitProviderId: GitProviderId,
    owner: string,
    repo: string,
    branch: string,
    source: ClientSource,
  ): Promise<GitRepo> {
    const command = {
      userId,
      organizationId,
      gitProviderId,
      owner,
      repo,
      branch,
      source,
    };

    return await this.gitAdapter.addGitRepo(command);
  }

  async listProviders(
    command: ListProvidersCommand,
  ): Promise<ListProvidersResponse> {
    return this.gitAdapter.listProviders(command);
  }

  async getRepositories(organizationId: OrganizationId): Promise<GitRepo[]> {
    return this.gitAdapter.getOrganizationRepositories(organizationId);
  }

  async listAvailableRepos(gitProviderId: GitProviderId): Promise<
    {
      name: string;
      owner: string;
      description?: string;
      private: boolean;
      defaultBranch: string;
      language?: string;
      stars: number;
    }[]
  > {
    return this.gitAdapter.listAvailableRepos(gitProviderId);
  }

  async checkBranchExists(
    organizationId: OrganizationId,
    gitProviderId: GitProviderId,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<boolean> {
    return this.gitAdapter.checkBranchExists(
      gitProviderId,
      owner,
      repo,
      branch,
    );
  }

  async updateGitProvider(
    id: GitProviderId,
    gitProvider: Partial<Omit<GitProvider, 'id'>>,
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<GitProvider> {
    return this.gitAdapter.updateGitProvider(
      id,
      gitProvider,
      userId,
      organizationId,
    );
  }

  async deleteGitProvider(
    id: GitProviderId,
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<void> {
    return this.gitAdapter.deleteGitProvider(id, userId, organizationId);
  }

  async removeRepositoryFromProvider(
    providerId: GitProviderId,
    userId: UserId,
    organizationId: OrganizationId,
    repositoryId: GitRepoId,
  ): Promise<void> {
    return this.gitAdapter.deleteGitRepo(
      repositoryId,
      userId,
      organizationId,
      providerId,
    );
  }
}
