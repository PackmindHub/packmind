import axios from 'axios';
import {
  IAccountsPort,
  NoGitHubAppRegisteredError,
  NotAGitHubAppProviderError,
  Organization,
  User,
  createGitHubAppConfigId,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { IGitHubAppConfigRepository } from '../../../../domain/repositories/IGitHubAppConfigRepository';
import { GitProviderService } from '../../../GitProviderService';
import { GithubAppInstallationRepositoriesFetcher } from '../../../services/GithubAppInstallationRepositoriesFetcher';
import { GithubAppTokenService } from '../../../services/GithubAppTokenService';
import { ListInstallationRepositoriesUseCase } from './listInstallationRepositories.usecase';
import { gitProviderFactory } from '../../../../../test';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ListInstallationRepositoriesUseCase', () => {
  const organizationId = createOrganizationId('org-123');
  const userId = createUserId('member-user');

  const memberUser: User = {
    id: userId,
    email: 'member@example.com',
    passwordHash: null,
    active: true,
    memberships: [{ userId, organizationId, role: 'member' }],
  };

  const organization: Organization = {
    id: organizationId,
    name: 'Test Org',
    slug: 'test-org',
  };

  const activeConfig = {
    id: createGitHubAppConfigId('cfg-id'),
    appId: 12345,
    slug: 'my-packmind-app',
    htmlUrl: 'https://github.com/apps/my-packmind-app',
    clientId: 'Iv1.abc123',
    clientSecret: 'secret',
    privateKey:
      '-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----',
    webhookSecret: 'webhook-secret',
  };

  const appProvider = gitProviderFactory({
    organizationId,
    source: 'github',
    authType: 'github_app',
    githubAppInstallationId: 42,
  });

  const makeGithubRepo = (name: string) => ({
    name,
    full_name: `my-org/${name}`,
    owner: { login: 'my-org' },
    default_branch: 'main',
    private: false,
    description: null,
  });

  let useCase: ListInstallationRepositoriesUseCase;
  let gitHubAppConfigRepository: jest.Mocked<IGitHubAppConfigRepository>;
  let githubAppTokenService: jest.Mocked<GithubAppTokenService>;
  let gitProviderService: jest.Mocked<GitProviderService>;
  let accountsPort: jest.Mocked<IAccountsPort>;

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(memberUser),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    gitHubAppConfigRepository = {
      findActive: jest.fn().mockResolvedValue(activeConfig),
      save: jest.fn(),
      deleteActive: jest.fn(),
    } as jest.Mocked<IGitHubAppConfigRepository>;

    githubAppTokenService = {
      getInstallationToken: jest.fn().mockResolvedValue('installation-token'),
      generateAppJwt: jest.fn(),
    } as unknown as jest.Mocked<GithubAppTokenService>;

    gitProviderService = {
      findGitProviderById: jest.fn().mockResolvedValue(appProvider),
    } as unknown as jest.Mocked<GitProviderService>;

    mockedAxios.get = jest.fn().mockResolvedValue({
      data: { total_count: 1, repositories: [makeGithubRepo('repo-a')] },
    });

    useCase = new ListInstallationRepositoriesUseCase(
      accountsPort,
      gitHubAppConfigRepository,
      githubAppTokenService,
      gitProviderService,
      new GithubAppInstallationRepositoriesFetcher(),
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const buildCommand = () => ({
    userId,
    organizationId,
    gitProviderId: appProvider.id,
  });

  describe('when provider is not found', () => {
    it('throws an error', async () => {
      gitProviderService.findGitProviderById.mockResolvedValue(null);
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        'Git provider not found',
      );
    });
  });

  describe('when provider belongs to a different organization', () => {
    it('throws an error', async () => {
      const otherOrgProvider = gitProviderFactory({
        organizationId: createOrganizationId('other-org'),
        authType: 'github_app',
        githubAppInstallationId: 42,
      });
      gitProviderService.findGitProviderById.mockResolvedValue(
        otherOrgProvider,
      );
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        'Git provider not found',
      );
    });
  });

  describe('when provider is not a GitHub App provider', () => {
    it('throws NotAGitHubAppProviderError when authType is pat', async () => {
      const patProvider = gitProviderFactory({
        organizationId,
        source: 'github',
        authType: 'pat',
        githubAppInstallationId: null,
      });
      gitProviderService.findGitProviderById.mockResolvedValue(patProvider);
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        NotAGitHubAppProviderError,
      );
    });

    it('throws NotAGitHubAppProviderError when installationId is null', async () => {
      const noInstallProvider = gitProviderFactory({
        organizationId,
        source: 'github',
        authType: 'github_app',
        githubAppInstallationId: null,
      });
      gitProviderService.findGitProviderById.mockResolvedValue(
        noInstallProvider,
      );
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        NotAGitHubAppProviderError,
      );
    });
  });

  describe('when no GitHub App config is registered', () => {
    it('throws NoGitHubAppRegisteredError', async () => {
      gitHubAppConfigRepository.findActive.mockResolvedValue(null);
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        NoGitHubAppRegisteredError,
      );
    });
  });

  describe('pagination', () => {
    it('fetches all pages when first page returns 100 repos', async () => {
      const firstPageRepos = Array.from({ length: 100 }, (_, i) =>
        makeGithubRepo(`repo-${i}`),
      );
      const secondPageRepos = [makeGithubRepo('repo-last')];

      mockedAxios.get = jest
        .fn()
        .mockResolvedValueOnce({
          data: { total_count: 101, repositories: firstPageRepos },
        })
        .mockResolvedValueOnce({
          data: { total_count: 101, repositories: secondPageRepos },
        });

      const result = await useCase.execute(buildCommand());

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(mockedAxios.get).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('page=1'),
        expect.any(Object),
      );
      expect(mockedAxios.get).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('page=2'),
        expect.any(Object),
      );
      expect(result.repositories).toHaveLength(101);
    });

    it('stops pagination when fewer than 100 repos are returned', async () => {
      mockedAxios.get = jest.fn().mockResolvedValue({
        data: {
          total_count: 5,
          repositories: Array.from({ length: 5 }, (_, i) =>
            makeGithubRepo(`repo-${i}`),
          ),
        },
      });

      await useCase.execute(buildCommand());

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('response mapping', () => {
    it('maps GitHub fields to the response shape', async () => {
      const githubRepo = {
        name: 'my-repo',
        full_name: 'my-org/my-repo',
        owner: { login: 'my-org' },
        default_branch: 'main',
        private: true,
        description: 'A test repo',
      };
      mockedAxios.get = jest.fn().mockResolvedValue({
        data: { total_count: 1, repositories: [githubRepo] },
      });

      const result = await useCase.execute(buildCommand());

      expect(result.repositories).toEqual([
        {
          owner: 'my-org',
          name: 'my-repo',
          fullName: 'my-org/my-repo',
          defaultBranch: 'main',
          private: true,
          description: 'A test repo',
        },
      ]);
    });
  });
});
