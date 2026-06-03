import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AccountsHexa } from '@packmind/accounts';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  AddGitProviderCommand,
  CheckProviderAuthResponse,
  ClientSource,
  GitProvider,
  GitProviderId,
  GitRepo,
  GitRepoId,
  IGitPort,
  ListProvidersCommand,
  ListProvidersResponse,
  OrganizationGitHubApp,
  OrganizationGitHubAppId,
  OrganizationId,
  UserId,
  createOrganizationGitHubAppId,
} from '@packmind/types';
import { InjectGitAdapter } from '../../../shared/HexaInjection';
import { Configuration } from '@packmind/node-utils';
import { InvalidInstallStateError, InstallStateSigner } from '@packmind/git';
import { INSTALL_STATE_SIGNER } from './git-providers.tokens';
import { resolvePackmindEdition } from '../../../shared/utils/edition';
import { GitHubAppManifest } from './types/GitHubAppManifest';
import axios from 'axios';

const origin = 'GitProvidersService';

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

type BuildGithubAppManifestCommand = {
  orgId: OrganizationId;
  userId: UserId;
};

type BuildGithubAppManifestResponse = {
  manifest: GitHubAppManifest;
  state: string;
  manifestPostUrl: string;
};

type CompleteGithubAppManifestCommand = {
  orgId: OrganizationId;
  userId: UserId;
  code: string;
  state: string;
};

type CompleteGithubAppManifestResponse = {
  installUrl: string;
};

type GetGithubAppStatusCommand = {
  orgId: OrganizationId;
};

type GetGithubAppStatusResponse = {
  hasApp: boolean;
  appSlug?: string;
  revokedAt?: Date | null;
};

type RevokeGithubAppCommand = {
  orgId: OrganizationId;
  userId: UserId;
};

@Injectable()
export class GitProvidersService {
  constructor(
    @InjectGitAdapter() private readonly gitAdapter: IGitPort,
    private readonly accountsHexa: AccountsHexa,
    @Inject(INSTALL_STATE_SIGNER)
    private readonly signer: InstallStateSigner,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
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
    const edition = await resolvePackmindEdition();

    let slug: string;
    let organizationGitHubAppId: string | undefined;

    if (edition === 'oss') {
      const record = await this.gitAdapter.getActiveOrganizationGitHubApp(
        command.organizationId,
      );
      if (!record) {
        throw new BadRequestException(
          'No GitHub App registered for this organization',
        );
      }
      slug = record.appSlug;
      organizationGitHubAppId = String(record.id);
    } else {
      const configuredSlug = await Configuration.getConfig('GITHUB_APP_SLUG');
      if (!configuredSlug) {
        throw new InternalServerErrorException(
          'GITHUB_APP_SLUG is not configured',
        );
      }
      slug = configuredSlug;
      // Cloud edition uses a shared App with credentials in env. The install
      // is still bound to the org-side OrganizationGitHubApp row in OSS only.
      // On cloud we leave organizationGitHubAppId unset; the resolver path on
      // cloud doesn't read it.
    }

    const state = this.signer.sign({
      orgId: String(command.organizationId),
      userId: String(command.userId),
      kind: 'install',
      organizationGitHubAppId,
    });

    const installUrl =
      'https://github.com/apps/' +
      encodeURIComponent(slug) +
      '/installations/new?state=' +
      encodeURIComponent(state);

    return { installUrl, state };
  }

  async buildGithubAppManifest(
    command: BuildGithubAppManifestCommand,
  ): Promise<BuildGithubAppManifestResponse> {
    const edition = await resolvePackmindEdition();
    if (edition !== 'oss') {
      throw new BadRequestException(
        'Manifest flow is only available on OSS edition',
      );
    }

    const appWebUrl = await Configuration.getConfig('APP_WEB_URL');
    if (!appWebUrl) {
      throw new BadRequestException('APP_WEB_URL is not configured');
    }

    const organization = await this.accountsHexa
      .getAdapter()
      .getOrganizationById({ organizationId: command.orgId });

    if (!organization) {
      throw new BadRequestException('Organization not found');
    }

    const state = this.signer.sign({
      orgId: String(command.orgId),
      userId: String(command.userId),
      kind: 'manifest',
    });

    const manifest: GitHubAppManifest = {
      name: `Packmind on ${organization.name}`,
      url: appWebUrl,
      redirect_url: `${appWebUrl}/integrations/github-app/manifest-callback`,
      setup_url: `${appWebUrl}/integrations/github-app/install-callback`,
      setup_on_update: true,
      hook_attributes: { url: `${appWebUrl}/api/v0/hooks/github-app` },
      public: false,
      default_permissions: {
        contents: 'write',
        metadata: 'read',
        pull_requests: 'write',
      },
      default_events: [],
    };

    return {
      manifest,
      state,
      manifestPostUrl: 'https://github.com/settings/apps/new',
    };
  }

  async completeGithubAppManifest(
    command: CompleteGithubAppManifestCommand,
  ): Promise<CompleteGithubAppManifestResponse> {
    const edition = await resolvePackmindEdition();
    if (edition !== 'oss') {
      throw new BadRequestException(
        'Manifest flow is only available on OSS edition',
      );
    }

    let payload;
    try {
      payload = this.signer.verify(command.state);
    } catch (error) {
      if (error instanceof InvalidInstallStateError) {
        throw new BadRequestException('Invalid manifest state');
      }
      throw error;
    }

    if (payload.kind !== 'manifest') {
      throw new BadRequestException('Invalid manifest state');
    }

    if (payload.orgId !== String(command.orgId)) {
      throw new BadRequestException('Invalid manifest state');
    }

    if (payload.userId !== String(command.userId)) {
      throw new BadRequestException('Invalid manifest state');
    }

    // Exchange the code with GitHub (unauthenticated — the code IS the auth)
    let conversionData: {
      id: number;
      slug: string;
      client_id: string;
      client_secret: string;
      webhook_secret: string;
      pem: string;
    };
    try {
      const response = await axios.post<typeof conversionData>(
        `https://api.github.com/app-manifests/${encodeURIComponent(command.code)}/conversions`,
        undefined,
        {
          headers: {
            Accept: 'application/vnd.github+json',
          },
        },
      );
      conversionData = response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const message =
          (error.response.data as { message?: string })?.message ??
          'GitHub code conversion failed';
        throw new BadRequestException(message);
      }
      throw error;
    }

    const app: OrganizationGitHubApp = {
      id: createOrganizationGitHubAppId(uuidv4()),
      organizationId: command.orgId,
      appId: conversionData.id,
      appSlug: conversionData.slug,
      appClientId: conversionData.client_id,
      appClientSecret: conversionData.client_secret,
      appPrivateKey: conversionData.pem,
      appWebhookSecret: conversionData.webhook_secret,
    };

    const persistedApp = await this.gitAdapter.upsertOrganizationGitHubApp(app);

    const installState = this.signer.sign({
      orgId: String(command.orgId),
      userId: String(command.userId),
      kind: 'install',
      organizationGitHubAppId: String(persistedApp.id),
    });

    const installUrl =
      'https://github.com/apps/' +
      encodeURIComponent(conversionData.slug) +
      '/installations/new?state=' +
      encodeURIComponent(installState);

    return { installUrl };
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

    if (payload.kind !== 'install') {
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

    const edition = await resolvePackmindEdition();
    let organizationGitHubAppId: OrganizationGitHubAppId | null = null;

    if (edition === 'oss') {
      // OSS binds every app-auth provider to a specific stored App so that
      // re-running the manifest flow doesn't silently rebind old installations
      // to a newer App (which would 404 at the next JWT exchange).
      if (!payload.organizationGitHubAppId) {
        throw new BadRequestException('Invalid or expired state token');
      }

      const app = await this.gitAdapter.getActiveOrganizationGitHubApp(
        command.organizationId,
      );
      if (!app || String(app.id) !== payload.organizationGitHubAppId) {
        throw new BadRequestException(
          'GitHub App is no longer active for this organization. Restart the install flow.',
        );
      }

      organizationGitHubAppId = createOrganizationGitHubAppId(
        payload.organizationGitHubAppId,
      );
    }

    const addCommand: AddGitProviderCommand = {
      userId: String(command.userId),
      organizationId: String(command.organizationId),
      gitProvider: {
        source: 'github',
        authMethod: 'app',
        appInstallationId: command.installationId,
        organizationGitHubAppId,
        url: null,
        token: null,
      },
      allowTokenlessProvider: true,
      source: command.source,
    };

    const provider = await this.gitAdapter.addGitProvider(addCommand);

    await this.materializeReposForAppInstallation(provider, command);

    return provider;
  }

  // After a GitHub App installation completes, mirror the repos the install
  // can access into Packmind: a GitRepo on its default branch and a Default
  // target via the addGitRepo use case. Per-repo failures are logged and
  // swallowed so a single bad repo does not abort the rest — the provider
  // is already persisted and the user can re-trigger setup later.
  private async materializeReposForAppInstallation(
    provider: GitProvider,
    command: CompleteGithubAppInstallCommand,
  ): Promise<void> {
    let availableRepos: Awaited<ReturnType<IGitPort['listAvailableRepos']>>;
    try {
      availableRepos = await this.gitAdapter.listAvailableRepos(provider.id);
    } catch (error) {
      this.logger.warn(
        'Failed to list available repos after GitHub App install',
        {
          providerId: provider.id,
          organizationId: command.organizationId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return;
    }

    this.logger.info('Materializing repos after GitHub App install', {
      providerId: provider.id,
      organizationId: command.organizationId,
      count: availableRepos.length,
    });

    let materialized = 0;
    for (const availableRepo of availableRepos) {
      try {
        await this.gitAdapter.addGitRepo({
          userId: String(command.userId),
          organizationId: String(command.organizationId),
          gitProviderId: provider.id,
          owner: availableRepo.owner,
          repo: availableRepo.name,
          branch: availableRepo.defaultBranch,
          allowTokenlessProvider: true,
          source: command.source,
        });
        materialized += 1;
      } catch (error) {
        this.logger.warn(
          'Failed to materialize repo after GitHub App install',
          {
            providerId: provider.id,
            organizationId: command.organizationId,
            owner: availableRepo.owner,
            repo: availableRepo.name,
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    this.logger.info(
      'Repo materialization completed after GitHub App install',
      {
        providerId: provider.id,
        organizationId: command.organizationId,
        materialized,
        attempted: availableRepos.length,
      },
    );
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

  async checkProviderAuth(
    organizationId: OrganizationId,
    gitProviderId: GitProviderId,
    userId: UserId,
  ): Promise<CheckProviderAuthResponse> {
    return this.gitAdapter.checkProviderAuth({
      organizationId,
      gitProviderId,
      userId,
    });
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

  async getGithubAppStatus(
    command: GetGithubAppStatusCommand,
  ): Promise<GetGithubAppStatusResponse> {
    const edition = await resolvePackmindEdition();

    // Cloud uses an env-configured shared GitHub App — no per-org record exists.
    if (edition !== 'oss') {
      return { hasApp: true };
    }

    const record = await this.gitAdapter.getActiveOrganizationGitHubApp(
      command.orgId,
    );

    return {
      hasApp: !!record,
      appSlug: record?.appSlug,
      revokedAt: record?.revokedAt ?? null,
    };
  }

  async revokeGithubApp(command: RevokeGithubAppCommand): Promise<void> {
    const edition = await resolvePackmindEdition();

    if (edition !== 'oss') {
      throw new BadRequestException(
        'GitHub App revocation is only available on OSS edition',
      );
    }

    const record = await this.gitAdapter.getActiveOrganizationGitHubApp(
      command.orgId,
    );

    if (!record) {
      throw new NotFoundException(
        'No active GitHub App found for this organization',
      );
    }

    // Mark the record revoked. This does NOT cascade-delete existing GitProvider
    // rows that point at this org — those will start failing at next token mint
    // when the resolver throws on a missing active app. The admin must re-register
    // and users will need to re-install the new app.
    await this.gitAdapter.revokeOrganizationGitHubApp(command.orgId);

    this.logger.warn('GitHub App revoked', {
      orgId: command.orgId,
      userId: command.userId,
    });
  }
}
