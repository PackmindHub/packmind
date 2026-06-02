// jest.mock calls are hoisted to the top of the file by babel/jest — place them
// before any import statements to ensure mocks are active before module loading.

// @packmind/git exports from its barrel (index.ts) which loads GitHexa →
// FetchFileContentDelayedJob → AbstractAIDelayedJob (undefined at test time).
// Mock the entire barrel and re-export only the classes needed by the service.
jest.mock('@packmind/git', () => {
  class InvalidInstallStateError extends Error {
    constructor(message = 'Invalid or expired state token') {
      super(message);
      this.name = 'InvalidInstallStateError';
    }
  }
  class InstallStateSigner {}
  return { InvalidInstallStateError, InstallStateSigner };
});

jest.mock('axios');

// @packmind/accounts → AccountsHexa loads broken use case hierarchies.
jest.mock('@packmind/accounts', () => ({
  AccountsHexa: class AccountsHexa {},
}));

// HexaInjection → HexaRegistryModule → @packmind/coding-agent (broken BaseHexa).
jest.mock('../../../shared/HexaInjection', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Inject } = require('@nestjs/common');
  return { InjectGitAdapter: () => Inject('GIT_ADAPTER') };
});

jest.mock('@packmind/node-utils', () => ({
  Configuration: { getConfig: jest.fn() },
}));

jest.mock('../../../shared/utils/edition', () => ({
  resolvePackmindEdition: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import { GitProvidersService } from './git-providers.service';
import { INSTALL_STATE_SIGNER } from './git-providers.tokens';
import {
  createOrganizationGitHubAppId,
  createOrganizationId,
  createUserId,
  IGitPort,
  OrganizationGitHubApp,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { InvalidInstallStateError } from '@packmind/git';
import axios from 'axios';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolvePackmindEdition } = require('../../../shared/utils/edition') as {
  resolvePackmindEdition: jest.Mock;
};

// The GIT_ADAPTER_TOKEN string value — mirrors GIT_ADAPTER_TOKEN in HexaRegistryModule
// but defined here to avoid the broken import chain.
const GIT_ADAPTER_TOKEN = 'GIT_ADAPTER';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Configuration } = require('@packmind/node-utils') as {
  Configuration: { getConfig: jest.Mock };
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AccountsHexa } = require('@packmind/accounts') as {
  AccountsHexa: new () => object;
};

describe('GitProvidersService', () => {
  let service: GitProvidersService;
  let mockGitAdapter: Partial<IGitPort>;
  let mockSigner: { sign: jest.Mock; verify: jest.Mock };
  let mockAccountsAdapter: { getOrganizationById: jest.Mock };

  beforeEach(async () => {
    mockGitAdapter = {
      addGitProvider: jest.fn(),
      addGitRepo: jest.fn(),
      listProviders: jest.fn(),
      getOrganizationRepositories: jest.fn(),
      listAvailableRepos: jest.fn(),
      checkBranchExists: jest.fn(),
      updateGitProvider: jest.fn(),
      deleteGitProvider: jest.fn(),
      deleteGitRepo: jest.fn(),
      upsertOrganizationGitHubApp: jest.fn(),
      getActiveOrganizationGitHubApp: jest.fn(),
      revokeOrganizationGitHubApp: jest.fn(),
    };

    mockSigner = {
      sign: jest.fn().mockReturnValue('STUB_STATE'),
      verify: jest.fn(),
    };

    mockAccountsAdapter = {
      getOrganizationById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitProvidersService,
        {
          provide: GIT_ADAPTER_TOKEN,
          useValue: mockGitAdapter,
        },
        {
          provide: AccountsHexa,
          useValue: { getAdapter: () => mockAccountsAdapter },
        },
        {
          provide: INSTALL_STATE_SIGNER,
          useValue: mockSigner,
        },
        {
          provide: PackmindLogger,
          useValue: stubLogger(),
        },
      ],
    }).compile();

    service = module.get<GitProvidersService>(GitProvidersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('buildGithubAppInstallUrl', () => {
    const orgId = createOrganizationId('org-123');
    const userId = createUserId('user-456');

    describe('cloud edition', () => {
      beforeEach(() => {
        resolvePackmindEdition.mockResolvedValue('cloud');
      });

      it('returns installUrl and state when slug is configured', async () => {
        Configuration.getConfig.mockResolvedValue('packmind-cloud');

        const result = await service.buildGithubAppInstallUrl({
          organizationId: orgId,
          userId,
        });

        expect(result).toEqual({
          installUrl:
            'https://github.com/apps/packmind-cloud/installations/new?state=STUB_STATE',
          state: 'STUB_STATE',
        });
      });

      it('calls signer.sign without organizationGitHubAppId on cloud edition', async () => {
        Configuration.getConfig.mockResolvedValue('packmind-cloud');

        await service.buildGithubAppInstallUrl({
          organizationId: orgId,
          userId,
        });

        expect(mockSigner.sign).toHaveBeenCalledWith({
          orgId: 'org-123',
          userId: 'user-456',
          kind: 'install',
          organizationGitHubAppId: undefined,
        });
      });

      it('throws InternalServerErrorException when slug is missing', async () => {
        Configuration.getConfig.mockResolvedValue(null);

        await expect(
          service.buildGithubAppInstallUrl({
            organizationId: orgId,
            userId,
          }),
        ).rejects.toThrow(InternalServerErrorException);
      });
    });

    describe('oss edition', () => {
      const activeApp: OrganizationGitHubApp = {
        id: createOrganizationGitHubAppId('app-1'),
        organizationId: orgId,
        appId: 42,
        appSlug: 'my-oss-app',
        appClientId: 'Iv1.abc',
        appClientSecret: 'secret',
        appPrivateKey: 'pem',
        appWebhookSecret: 'whsecret',
        revokedAt: null,
      };

      beforeEach(() => {
        resolvePackmindEdition.mockResolvedValue('oss');
      });

      it('returns installUrl and state using the slug from the stored app record', async () => {
        (
          mockGitAdapter.getActiveOrganizationGitHubApp as jest.Mock
        ).mockResolvedValue(activeApp);

        const result = await service.buildGithubAppInstallUrl({
          organizationId: orgId,
          userId,
        });

        expect(result).toEqual({
          installUrl:
            'https://github.com/apps/my-oss-app/installations/new?state=STUB_STATE',
          state: 'STUB_STATE',
        });
      });

      it('calls signer.sign including the stored OrganizationGitHubApp id on oss edition', async () => {
        (
          mockGitAdapter.getActiveOrganizationGitHubApp as jest.Mock
        ).mockResolvedValue(activeApp);

        await service.buildGithubAppInstallUrl({
          organizationId: orgId,
          userId,
        });

        expect(mockSigner.sign).toHaveBeenCalledWith({
          orgId: 'org-123',
          userId: 'user-456',
          kind: 'install',
          organizationGitHubAppId: 'app-1',
        });
      });

      it('throws BadRequestException when no active app record exists', async () => {
        (
          mockGitAdapter.getActiveOrganizationGitHubApp as jest.Mock
        ).mockResolvedValue(null);

        await expect(
          service.buildGithubAppInstallUrl({
            organizationId: orgId,
            userId,
          }),
        ).rejects.toThrow(
          new BadRequestException(
            'No GitHub App registered for this organization',
          ),
        );
      });
    });
  });

  describe('completeGithubAppInstall', () => {
    const orgId = createOrganizationId('org-123');
    const userId = createUserId('user-456');
    const orgGitHubAppId = createOrganizationGitHubAppId(
      '00000000-0000-0000-0000-000000000aaa',
    );
    const activeApp: OrganizationGitHubApp = {
      id: orgGitHubAppId,
      organizationId: orgId,
      appId: 42,
      appSlug: 'my-oss-app',
      appClientId: 'Iv1.abc',
      appClientSecret: 'secret',
      appPrivateKey: 'pem',
      appWebhookSecret: 'whsecret',
      revokedAt: null,
    };
    const validPayload = {
      orgId: 'org-123',
      userId: 'user-456',
      nonce: 'abc',
      exp: Math.floor(Date.now() / 1000) + 600,
      kind: 'install' as const,
      organizationGitHubAppId: orgGitHubAppId,
    };

    beforeEach(() => {
      // OSS is the canonical app-install path; cloud uses a shared App and
      // doesn't bind the install to an OrganizationGitHubApp row.
      resolvePackmindEdition.mockResolvedValue('oss');
      (
        mockGitAdapter.getActiveOrganizationGitHubApp as jest.Mock
      ).mockResolvedValue(activeApp);
      (mockGitAdapter.listAvailableRepos as jest.Mock).mockResolvedValue([]);
    });

    it('calls gitAdapter.addGitProvider with correct app-method command including the OrganizationGitHubApp id', async () => {
      mockSigner.verify.mockReturnValue(validPayload);
      const mockProvider = {
        id: 'prov-1',
        source: 'github',
        authMethod: 'app',
      };
      (mockGitAdapter.addGitProvider as jest.Mock).mockResolvedValue(
        mockProvider,
      );

      await service.completeGithubAppInstall({
        organizationId: orgId,
        userId,
        installationId: 12345,
        state: 'STUB_STATE',
        source: 'web',
      });

      expect(mockGitAdapter.addGitProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          gitProvider: expect.objectContaining({
            authMethod: 'app',
            source: 'github',
            appInstallationId: 12345,
            organizationGitHubAppId: orgGitHubAppId,
          }),
          allowTokenlessProvider: true,
        }),
      );
    });

    it('throws BadRequestException on oss when state lacks organizationGitHubAppId', async () => {
      mockSigner.verify.mockReturnValue({
        ...validPayload,
        organizationGitHubAppId: undefined,
      });

      await expect(
        service.completeGithubAppInstall({
          organizationId: orgId,
          userId,
          installationId: 12345,
          state: 'STUB_STATE',
          source: 'web',
        }),
      ).rejects.toThrow(
        new BadRequestException('Invalid or expired state token'),
      );
    });

    it('throws BadRequestException on oss when the active app no longer matches the state', async () => {
      mockSigner.verify.mockReturnValue(validPayload);
      (
        mockGitAdapter.getActiveOrganizationGitHubApp as jest.Mock
      ).mockResolvedValue({
        ...activeApp,
        id: createOrganizationGitHubAppId(
          '00000000-0000-0000-0000-000000000bbb',
        ),
      });

      await expect(
        service.completeGithubAppInstall({
          organizationId: orgId,
          userId,
          installationId: 12345,
          state: 'STUB_STATE',
          source: 'web',
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'GitHub App is no longer active for this organization. Restart the install flow.',
        ),
      );
    });

    describe('repository materialization', () => {
      const mockProvider = {
        id: 'prov-1',
        source: 'github',
        authMethod: 'app',
      };

      beforeEach(() => {
        mockSigner.verify.mockReturnValue(validPayload);
        (mockGitAdapter.addGitProvider as jest.Mock).mockResolvedValue(
          mockProvider,
        );
      });

      it('calls addGitRepo for each repo the installation can access', async () => {
        (mockGitAdapter.listAvailableRepos as jest.Mock).mockResolvedValue([
          {
            name: 'repo-a',
            owner: 'acme',
            private: false,
            defaultBranch: 'main',
            stars: 0,
          },
          {
            name: 'repo-b',
            owner: 'acme',
            private: true,
            defaultBranch: 'develop',
            stars: 5,
          },
        ]);

        await service.completeGithubAppInstall({
          organizationId: orgId,
          userId,
          installationId: 12345,
          state: 'STUB_STATE',
          source: 'web',
        });

        expect(mockGitAdapter.addGitRepo).toHaveBeenCalledTimes(2);
        expect(mockGitAdapter.addGitRepo).toHaveBeenNthCalledWith(1, {
          userId: 'user-456',
          organizationId: 'org-123',
          gitProviderId: 'prov-1',
          owner: 'acme',
          repo: 'repo-a',
          branch: 'main',
          allowTokenlessProvider: true,
          source: 'web',
        });
        expect(mockGitAdapter.addGitRepo).toHaveBeenNthCalledWith(2, {
          userId: 'user-456',
          organizationId: 'org-123',
          gitProviderId: 'prov-1',
          owner: 'acme',
          repo: 'repo-b',
          branch: 'develop',
          allowTokenlessProvider: true,
          source: 'web',
        });
      });

      it('does not call addGitRepo when the installation has no repos', async () => {
        (mockGitAdapter.listAvailableRepos as jest.Mock).mockResolvedValue([]);

        const result = await service.completeGithubAppInstall({
          organizationId: orgId,
          userId,
          installationId: 12345,
          state: 'STUB_STATE',
          source: 'web',
        });

        expect(mockGitAdapter.addGitRepo).not.toHaveBeenCalled();
        expect(result).toEqual(mockProvider);
      });

      it('continues materializing remaining repos when one addGitRepo call fails', async () => {
        (mockGitAdapter.listAvailableRepos as jest.Mock).mockResolvedValue([
          {
            name: 'repo-a',
            owner: 'acme',
            private: false,
            defaultBranch: 'main',
            stars: 0,
          },
          {
            name: 'repo-b',
            owner: 'acme',
            private: true,
            defaultBranch: 'main',
            stars: 0,
          },
        ]);
        (mockGitAdapter.addGitRepo as jest.Mock)
          .mockRejectedValueOnce(new Error('repo-a already exists'))
          .mockResolvedValueOnce({ id: 'repo-b-id' });

        const result = await service.completeGithubAppInstall({
          organizationId: orgId,
          userId,
          installationId: 12345,
          state: 'STUB_STATE',
          source: 'web',
        });

        expect(mockGitAdapter.addGitRepo).toHaveBeenCalledTimes(2);
        expect(result).toEqual(mockProvider);
      });

      it('still returns the provider when listAvailableRepos throws', async () => {
        (mockGitAdapter.listAvailableRepos as jest.Mock).mockRejectedValue(
          new Error('GitHub API rate limit'),
        );

        const result = await service.completeGithubAppInstall({
          organizationId: orgId,
          userId,
          installationId: 12345,
          state: 'STUB_STATE',
          source: 'web',
        });

        expect(mockGitAdapter.addGitRepo).not.toHaveBeenCalled();
        expect(result).toEqual(mockProvider);
      });
    });

    it('throws BadRequestException when signer.verify throws InvalidInstallStateError', async () => {
      mockSigner.verify.mockImplementation(() => {
        throw new InvalidInstallStateError();
      });

      await expect(
        service.completeGithubAppInstall({
          organizationId: orgId,
          userId,
          installationId: 1,
          state: 'BAD_STATE',
          source: 'web',
        }),
      ).rejects.toThrow(
        new BadRequestException('Invalid or expired state token'),
      );
    });

    it('throws BadRequestException when payload.orgId does not match command.organizationId', async () => {
      mockSigner.verify.mockReturnValue({
        ...validPayload,
        orgId: 'other-org',
      });

      await expect(
        service.completeGithubAppInstall({
          organizationId: orgId,
          userId,
          installationId: 1,
          state: 'STUB_STATE',
          source: 'web',
        }),
      ).rejects.toThrow(
        new BadRequestException('Invalid or expired state token'),
      );
    });

    it('throws BadRequestException when payload.userId does not match command.userId', async () => {
      mockSigner.verify.mockReturnValue({
        ...validPayload,
        userId: 'other-user',
      });

      await expect(
        service.completeGithubAppInstall({
          organizationId: orgId,
          userId,
          installationId: 1,
          state: 'STUB_STATE',
          source: 'web',
        }),
      ).rejects.toThrow(
        new BadRequestException('Invalid or expired state token'),
      );
    });

    it('throws BadRequestException for installationId = 0', async () => {
      mockSigner.verify.mockReturnValue(validPayload);

      await expect(
        service.completeGithubAppInstall({
          organizationId: orgId,
          userId,
          installationId: 0,
          state: 'STUB_STATE',
          source: 'web',
        }),
      ).rejects.toThrow(
        new BadRequestException('installationId must be a positive integer'),
      );
    });

    it('throws BadRequestException for installationId = -1', async () => {
      mockSigner.verify.mockReturnValue(validPayload);

      await expect(
        service.completeGithubAppInstall({
          organizationId: orgId,
          userId,
          installationId: -1,
          state: 'STUB_STATE',
          source: 'web',
        }),
      ).rejects.toThrow(
        new BadRequestException('installationId must be a positive integer'),
      );
    });

    it('throws BadRequestException for installationId = 1.5', async () => {
      mockSigner.verify.mockReturnValue(validPayload);

      await expect(
        service.completeGithubAppInstall({
          organizationId: orgId,
          userId,
          installationId: 1.5,
          state: 'STUB_STATE',
          source: 'web',
        }),
      ).rejects.toThrow(
        new BadRequestException('installationId must be a positive integer'),
      );
    });

    it('throws BadRequestException for installationId = NaN', async () => {
      mockSigner.verify.mockReturnValue(validPayload);

      await expect(
        service.completeGithubAppInstall({
          organizationId: orgId,
          userId,
          installationId: NaN,
          state: 'STUB_STATE',
          source: 'web',
        }),
      ).rejects.toThrow(
        new BadRequestException('installationId must be a positive integer'),
      );
    });
  });

  describe('buildGithubAppManifest', () => {
    const orgId = createOrganizationId('org-123');
    const userId = createUserId('user-456');
    const appWebUrl = 'https://app.example.com';

    beforeEach(() => {
      resolvePackmindEdition.mockResolvedValue('oss');
      Configuration.getConfig.mockResolvedValue(appWebUrl);
      mockAccountsAdapter.getOrganizationById.mockResolvedValue({
        id: orgId,
        name: 'Acme Corp',
        slug: 'acme-corp',
      });
    });

    it('returns manifest, state, and manifestPostUrl on oss edition', async () => {
      const result = await service.buildGithubAppManifest({ orgId, userId });

      expect(result).toEqual({
        manifest: expect.objectContaining({
          name: 'Packmind on Acme Corp',
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
        }),
        state: 'STUB_STATE',
        manifestPostUrl: 'https://github.com/settings/apps/new',
      });
    });

    it('calls signer.sign with kind manifest, orgId and userId', async () => {
      await service.buildGithubAppManifest({ orgId, userId });

      expect(mockSigner.sign).toHaveBeenCalledWith({
        orgId: 'org-123',
        userId: 'user-456',
        kind: 'manifest',
      });
    });

    it('throws BadRequestException when edition is cloud', async () => {
      resolvePackmindEdition.mockResolvedValue('cloud');

      await expect(
        service.buildGithubAppManifest({ orgId, userId }),
      ).rejects.toThrow(
        new BadRequestException(
          'Manifest flow is only available on OSS edition',
        ),
      );
    });

    it('throws BadRequestException when APP_WEB_URL is missing', async () => {
      Configuration.getConfig.mockResolvedValue(null);

      await expect(
        service.buildGithubAppManifest({ orgId, userId }),
      ).rejects.toThrow(
        new BadRequestException('APP_WEB_URL is not configured'),
      );
    });

    it('throws BadRequestException when organization is not found', async () => {
      mockAccountsAdapter.getOrganizationById.mockResolvedValue(null);

      await expect(
        service.buildGithubAppManifest({ orgId, userId }),
      ).rejects.toThrow(new BadRequestException('Organization not found'));
    });
  });

  describe('completeGithubAppManifest', () => {
    const orgId = createOrganizationId('org-123');
    const userId = createUserId('user-456');
    const validManifestPayload = {
      orgId: 'org-123',
      userId: 'user-456',
      nonce: 'abc',
      exp: Math.floor(Date.now() / 1000) + 600,
      kind: 'manifest' as const,
    };
    const githubConversionResponse = {
      id: 42,
      slug: 'my-packmind-app',
      client_id: 'Iv1.client123',
      client_secret: 'secret-abc',
      webhook_secret: 'webhook-xyz',
      pem: '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----\n',
    };

    const mockedAxios = axios as jest.Mocked<typeof axios>;

    beforeEach(() => {
      resolvePackmindEdition.mockResolvedValue('oss');
      mockSigner.verify.mockReturnValue(validManifestPayload);
      mockSigner.sign.mockReturnValue('INSTALL_STATE');
      mockedAxios.post = jest.fn().mockResolvedValue({
        data: githubConversionResponse,
      });
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(false);
      (
        mockGitAdapter.upsertOrganizationGitHubApp as jest.Mock
      ).mockImplementation((app) => Promise.resolve(app));
    });

    it('returns installUrl pointing to the new app slug', async () => {
      const result = await service.completeGithubAppManifest({
        orgId,
        userId,
        code: 'gh-code-123',
        state: 'MANIFEST_STATE',
      });

      expect(result).toEqual({
        installUrl:
          'https://github.com/apps/my-packmind-app/installations/new?state=INSTALL_STATE',
      });
    });

    it('calls upsertOrganizationGitHubApp with correct fields', async () => {
      await service.completeGithubAppManifest({
        orgId,
        userId,
        code: 'gh-code-123',
        state: 'MANIFEST_STATE',
      });

      expect(mockGitAdapter.upsertOrganizationGitHubApp).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          appId: 42,
          appSlug: 'my-packmind-app',
          appClientId: 'Iv1.client123',
          appClientSecret: 'secret-abc',
          appPrivateKey: githubConversionResponse.pem,
          appWebhookSecret: 'webhook-xyz',
        }),
      );
    });

    it('calls signer.sign with kind install and the new OrganizationGitHubApp id to build the install URL', async () => {
      await service.completeGithubAppManifest({
        orgId,
        userId,
        code: 'gh-code-123',
        state: 'MANIFEST_STATE',
      });

      expect(mockSigner.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: 'org-123',
          userId: 'user-456',
          kind: 'install',
          organizationGitHubAppId: expect.any(String),
        }),
      );
    });

    it('throws BadRequestException when state kind is install', async () => {
      mockSigner.verify.mockReturnValue({
        ...validManifestPayload,
        kind: 'install',
      });

      await expect(
        service.completeGithubAppManifest({
          orgId,
          userId,
          code: 'gh-code-123',
          state: 'INSTALL_STATE',
        }),
      ).rejects.toThrow(new BadRequestException('Invalid manifest state'));
    });

    it('throws BadRequestException when payload orgId does not match command orgId', async () => {
      mockSigner.verify.mockReturnValue({
        ...validManifestPayload,
        orgId: 'other-org',
      });

      await expect(
        service.completeGithubAppManifest({
          orgId,
          userId,
          code: 'gh-code-123',
          state: 'MANIFEST_STATE',
        }),
      ).rejects.toThrow(new BadRequestException('Invalid manifest state'));
    });

    it('throws BadRequestException when signer.verify throws InvalidInstallStateError', async () => {
      mockSigner.verify.mockImplementation(() => {
        throw new InvalidInstallStateError();
      });

      await expect(
        service.completeGithubAppManifest({
          orgId,
          userId,
          code: 'gh-code-123',
          state: 'BAD_STATE',
        }),
      ).rejects.toThrow(new BadRequestException('Invalid manifest state'));
    });

    it('throws BadRequestException when GitHub conversion returns a 4xx error', async () => {
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);
      mockedAxios.post = jest.fn().mockRejectedValue({
        response: { data: { message: 'Not Found' }, status: 404 },
        isAxiosError: true,
      });

      await expect(
        service.completeGithubAppManifest({
          orgId,
          userId,
          code: 'bad-code',
          state: 'MANIFEST_STATE',
        }),
      ).rejects.toThrow(new BadRequestException('Not Found'));
    });

    it('throws BadRequestException when edition is cloud', async () => {
      resolvePackmindEdition.mockResolvedValue('cloud');

      await expect(
        service.completeGithubAppManifest({
          orgId,
          userId,
          code: 'gh-code-123',
          state: 'MANIFEST_STATE',
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'Manifest flow is only available on OSS edition',
        ),
      );
    });
  });

  describe('getGithubAppStatus', () => {
    const orgId = createOrganizationId('org-123');

    const activeApp: OrganizationGitHubApp = {
      id: createOrganizationGitHubAppId('app-1'),
      organizationId: orgId,
      appId: 42,
      appSlug: 'my-packmind-app',
      appClientId: 'Iv1.abc',
      appClientSecret: 'secret',
      appPrivateKey: 'pem',
      appWebhookSecret: 'whsecret',
      revokedAt: null,
    };

    it('returns hasApp true without appSlug on cloud edition', async () => {
      resolvePackmindEdition.mockResolvedValue('cloud');

      const result = await service.getGithubAppStatus({ orgId });

      expect(result).toEqual({ hasApp: true });
      expect(
        mockGitAdapter.getActiveOrganizationGitHubApp,
      ).not.toHaveBeenCalled();
    });

    it('returns hasApp true with appSlug when active record exists on oss edition', async () => {
      resolvePackmindEdition.mockResolvedValue('oss');
      (
        mockGitAdapter.getActiveOrganizationGitHubApp as jest.Mock
      ).mockResolvedValue(activeApp);

      const result = await service.getGithubAppStatus({ orgId });

      expect(result).toEqual({
        hasApp: true,
        appSlug: 'my-packmind-app',
        revokedAt: null,
      });
    });

    it('returns hasApp false when no active record exists on oss edition', async () => {
      resolvePackmindEdition.mockResolvedValue('oss');
      (
        mockGitAdapter.getActiveOrganizationGitHubApp as jest.Mock
      ).mockResolvedValue(null);

      const result = await service.getGithubAppStatus({ orgId });

      expect(result).toEqual({
        hasApp: false,
        appSlug: undefined,
        revokedAt: null,
      });
    });

    it('returns revokedAt when record has a revoked date on oss edition', async () => {
      resolvePackmindEdition.mockResolvedValue('oss');
      const revokedAt = new Date('2025-01-01T00:00:00Z');
      (
        mockGitAdapter.getActiveOrganizationGitHubApp as jest.Mock
      ).mockResolvedValue({ ...activeApp, revokedAt });

      const result = await service.getGithubAppStatus({ orgId });

      expect(result).toEqual({
        hasApp: true,
        appSlug: 'my-packmind-app',
        revokedAt,
      });
    });
  });

  describe('revokeGithubApp', () => {
    const orgId = createOrganizationId('org-123');
    const userId = createUserId('user-456');

    const activeApp: OrganizationGitHubApp = {
      id: createOrganizationGitHubAppId('app-1'),
      organizationId: orgId,
      appId: 42,
      appSlug: 'my-packmind-app',
      appClientId: 'Iv1.abc',
      appClientSecret: 'secret',
      appPrivateKey: 'pem',
      appWebhookSecret: 'whsecret',
      revokedAt: null,
    };

    it('calls revokeOrganizationGitHubApp when active record exists on oss edition', async () => {
      resolvePackmindEdition.mockResolvedValue('oss');
      (
        mockGitAdapter.getActiveOrganizationGitHubApp as jest.Mock
      ).mockResolvedValue(activeApp);
      (
        mockGitAdapter.revokeOrganizationGitHubApp as jest.Mock
      ).mockResolvedValue(undefined);

      await service.revokeGithubApp({ orgId, userId });

      expect(mockGitAdapter.revokeOrganizationGitHubApp).toHaveBeenCalledWith(
        orgId,
      );
    });

    it('throws NotFoundException when no active record exists on oss edition', async () => {
      resolvePackmindEdition.mockResolvedValue('oss');
      (
        mockGitAdapter.getActiveOrganizationGitHubApp as jest.Mock
      ).mockResolvedValue(null);

      await expect(service.revokeGithubApp({ orgId, userId })).rejects.toThrow(
        new NotFoundException(
          'No active GitHub App found for this organization',
        ),
      );
    });

    it('throws BadRequestException when edition is cloud', async () => {
      resolvePackmindEdition.mockResolvedValue('cloud');

      await expect(service.revokeGithubApp({ orgId, userId })).rejects.toThrow(
        new BadRequestException(
          'GitHub App revocation is only available on OSS edition',
        ),
      );

      expect(
        mockGitAdapter.getActiveOrganizationGitHubApp,
      ).not.toHaveBeenCalled();
    });
  });
});
