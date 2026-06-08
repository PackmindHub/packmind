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
  return {
    InjectGitAdapter: () => Inject('GIT_ADAPTER'),
    InjectDeploymentAdapter: () => Inject('DEPLOYMENT_ADAPTER'),
  };
});

jest.mock('@packmind/node-utils', () => ({
  Configuration: { getConfig: jest.fn() },
  removeTrailingSlash: (url: string) =>
    url.endsWith('/') ? url.slice(0, -1) : url,
}));

jest.mock('../../../shared/utils/edition', () => ({
  resolveGithubAppMode: jest.fn(),
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
  IDeploymentPort,
  IGitPort,
  OrganizationGitHubApp,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { InvalidInstallStateError } from '@packmind/git';
import axios from 'axios';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveGithubAppMode } = require('../../../shared/utils/edition') as {
  resolveGithubAppMode: jest.Mock;
};

// The GIT_ADAPTER_TOKEN string value — mirrors GIT_ADAPTER_TOKEN in HexaRegistryModule
// but defined here to avoid the broken import chain.
const GIT_ADAPTER_TOKEN = 'GIT_ADAPTER';
const DEPLOYMENT_ADAPTER_TOKEN = 'DEPLOYMENT_ADAPTER';

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
  let mockDeploymentAdapter: Partial<IDeploymentPort>;
  let mockSigner: { sign: jest.Mock; verify: jest.Mock };
  let mockAccountsAdapter: { getOrganizationById: jest.Mock };

  beforeEach(async () => {
    mockDeploymentAdapter = {
      getLastDeploymentDateByProviders: jest
        .fn()
        .mockResolvedValue({ datesByProviderId: {} }),
    };

    mockGitAdapter = {
      addGitProvider: jest.fn(),
      findGitProviderByAppInstallation: jest.fn(),
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
          provide: DEPLOYMENT_ADAPTER_TOKEN,
          useValue: mockDeploymentAdapter,
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

    describe('shared mode', () => {
      beforeEach(() => {
        resolveGithubAppMode.mockResolvedValue('shared');
      });

      describe('when slug is configured', () => {
        beforeEach(() => {
          Configuration.getConfig.mockResolvedValue('packmind-cloud');
        });

        it('returns installUrl and state', async () => {
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

        it('calls signer.sign without organizationGitHubAppId', async () => {
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
      });

      describe('when slug is missing', () => {
        it('throws InternalServerErrorException', async () => {
          Configuration.getConfig.mockResolvedValue(null);

          await expect(
            service.buildGithubAppInstallUrl({
              organizationId: orgId,
              userId,
            }),
          ).rejects.toThrow(InternalServerErrorException);
        });
      });
    });

    describe('on-prem mode', () => {
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
        resolveGithubAppMode.mockResolvedValue('on-prem');
      });

      describe('when an active app record exists', () => {
        beforeEach(() => {
          (
            mockGitAdapter.getActiveOrganizationGitHubApp as jest.Mock
          ).mockResolvedValue(activeApp);
        });

        it('returns installUrl and state using the slug from the stored app record', async () => {
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

        it('calls signer.sign including the stored OrganizationGitHubApp id', async () => {
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
      });

      describe('when no active app record exists', () => {
        it('throws BadRequestException', async () => {
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
      resolveGithubAppMode.mockResolvedValue('on-prem');
      (
        mockGitAdapter.getActiveOrganizationGitHubApp as jest.Mock
      ).mockResolvedValue(activeApp);
      (mockGitAdapter.listAvailableRepos as jest.Mock).mockResolvedValue([]);
      (
        mockGitAdapter.findGitProviderByAppInstallation as jest.Mock
      ).mockResolvedValue(null);
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

    describe('when state lacks organizationGitHubAppId', () => {
      it('throws BadRequestException', async () => {
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
    });

    describe('when the active app no longer matches the state', () => {
      it('throws BadRequestException', async () => {
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

      describe('when the installation can access repos', () => {
        beforeEach(async () => {
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
        });

        it('calls addGitRepo for each repo', () => {
          expect(mockGitAdapter.addGitRepo).toHaveBeenCalledTimes(2);
        });

        it('calls addGitRepo for the first repo with its arguments', () => {
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
        });

        it('calls addGitRepo for the second repo with its arguments', () => {
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
      });

      describe('when the installation has no repos', () => {
        let result: Awaited<
          ReturnType<typeof service.completeGithubAppInstall>
        >;

        beforeEach(async () => {
          (mockGitAdapter.listAvailableRepos as jest.Mock).mockResolvedValue(
            [],
          );

          result = await service.completeGithubAppInstall({
            organizationId: orgId,
            userId,
            installationId: 12345,
            state: 'STUB_STATE',
            source: 'web',
          });
        });

        it('does not call addGitRepo', () => {
          expect(mockGitAdapter.addGitRepo).not.toHaveBeenCalled();
        });

        it('returns the provider', () => {
          expect(result).toEqual(mockProvider);
        });
      });

      describe('when one addGitRepo call fails', () => {
        let result: Awaited<
          ReturnType<typeof service.completeGithubAppInstall>
        >;

        beforeEach(async () => {
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

          result = await service.completeGithubAppInstall({
            organizationId: orgId,
            userId,
            installationId: 12345,
            state: 'STUB_STATE',
            source: 'web',
          });
        });

        it('continues materializing remaining repos', () => {
          expect(mockGitAdapter.addGitRepo).toHaveBeenCalledTimes(2);
        });

        it('returns the provider', () => {
          expect(result).toEqual(mockProvider);
        });
      });

      describe('when listAvailableRepos throws', () => {
        let result: Awaited<
          ReturnType<typeof service.completeGithubAppInstall>
        >;

        beforeEach(async () => {
          (mockGitAdapter.listAvailableRepos as jest.Mock).mockRejectedValue(
            new Error('GitHub API rate limit'),
          );

          result = await service.completeGithubAppInstall({
            organizationId: orgId,
            userId,
            installationId: 12345,
            state: 'STUB_STATE',
            source: 'web',
          });
        });

        it('does not call addGitRepo', () => {
          expect(mockGitAdapter.addGitRepo).not.toHaveBeenCalled();
        });

        it('still returns the provider', () => {
          expect(result).toEqual(mockProvider);
        });
      });
    });

    describe('when a provider already exists for the installation', () => {
      const existingProvider = {
        id: 'prov-existing',
        source: 'github',
        authMethod: 'app',
        appInstallationId: 12345,
        organizationId: orgId,
        organizationGitHubAppId: orgGitHubAppId,
        url: null,
        token: null,
        displayName: '',
      };

      beforeEach(() => {
        mockSigner.verify.mockReturnValue(validPayload);
        (
          mockGitAdapter.findGitProviderByAppInstallation as jest.Mock
        ).mockResolvedValue(existingProvider);
      });

      describe('when the installation has no new repos', () => {
        beforeEach(async () => {
          (mockGitAdapter.listAvailableRepos as jest.Mock).mockResolvedValue(
            [],
          );

          await service.completeGithubAppInstall({
            organizationId: orgId,
            userId,
            installationId: 12345,
            state: 'STUB_STATE',
            source: 'ui',
          });
        });

        it('does not create a new provider', () => {
          expect(mockGitAdapter.addGitProvider).not.toHaveBeenCalled();
        });
      });

      it('returns the existing provider', async () => {
        const result = await service.completeGithubAppInstall({
          organizationId: orgId,
          userId,
          installationId: 12345,
          state: 'STUB_STATE',
          source: 'ui',
        });

        expect(result).toEqual(existingProvider);
      });

      describe('when the installation exposes repos', () => {
        beforeEach(async () => {
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
            source: 'ui',
          });
        });

        it('materializes repos against the existing provider id', () => {
          expect(mockGitAdapter.addGitRepo).toHaveBeenCalledWith(
            expect.objectContaining({ gitProviderId: 'prov-existing' }),
          );
        });
      });
    });

    describe('when signer.verify throws InvalidInstallStateError', () => {
      it('throws BadRequestException', async () => {
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
    });

    describe('when payload.orgId does not match command.organizationId', () => {
      it('throws BadRequestException', async () => {
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
    });

    describe('when payload.userId does not match command.userId', () => {
      it('throws BadRequestException', async () => {
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
      resolveGithubAppMode.mockResolvedValue('on-prem');
      Configuration.getConfig.mockResolvedValue(appWebUrl);
      mockAccountsAdapter.getOrganizationById.mockResolvedValue({
        id: orgId,
        name: 'Acme Corp',
        slug: 'acme-corp',
      });
    });

    it('returns manifest, state, and manifestPostUrl on on-prem mode', async () => {
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

    describe('when mode is shared', () => {
      it('throws BadRequestException', async () => {
        resolveGithubAppMode.mockResolvedValue('shared');

        await expect(
          service.buildGithubAppManifest({ orgId, userId }),
        ).rejects.toThrow(
          new BadRequestException(
            'Manifest flow is not available when a shared GitHub App is configured',
          ),
        );
      });
    });

    describe('when APP_WEB_URL is missing', () => {
      it('throws BadRequestException', async () => {
        Configuration.getConfig.mockResolvedValue(null);

        await expect(
          service.buildGithubAppManifest({ orgId, userId }),
        ).rejects.toThrow(
          new BadRequestException('APP_WEB_URL is not configured'),
        );
      });
    });

    describe('when organization is not found', () => {
      it('throws BadRequestException', async () => {
        mockAccountsAdapter.getOrganizationById.mockResolvedValue(null);

        await expect(
          service.buildGithubAppManifest({ orgId, userId }),
        ).rejects.toThrow(new BadRequestException('Organization not found'));
      });
    });

    describe('when APP_WEB_URL has a trailing slash', () => {
      beforeEach(() => {
        Configuration.getConfig.mockResolvedValue(`${appWebUrl}/`);
      });

      it('strips the trailing slash from the manifest url', async () => {
        const result = await service.buildGithubAppManifest({ orgId, userId });

        expect(result.manifest.url).toBe(appWebUrl);
      });

      it('strips the trailing slash from the redirect_url', async () => {
        const result = await service.buildGithubAppManifest({ orgId, userId });

        expect(result.manifest.redirect_url).toBe(
          `${appWebUrl}/integrations/github-app/manifest-callback`,
        );
      });

      it('strips the trailing slash from the setup_url', async () => {
        const result = await service.buildGithubAppManifest({ orgId, userId });

        expect(result.manifest.setup_url).toBe(
          `${appWebUrl}/integrations/github-app/install-callback`,
        );
      });

      it('strips the trailing slash from the hook_attributes url', async () => {
        const result = await service.buildGithubAppManifest({ orgId, userId });

        expect(result.manifest.hook_attributes.url).toBe(
          `${appWebUrl}/api/v0/hooks/github-app`,
        );
      });
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
      resolveGithubAppMode.mockResolvedValue('on-prem');
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

    describe('when state kind is install', () => {
      it('throws BadRequestException', async () => {
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
    });

    describe('when payload orgId does not match command orgId', () => {
      it('throws BadRequestException', async () => {
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
    });

    describe('when signer.verify throws InvalidInstallStateError', () => {
      it('throws BadRequestException', async () => {
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
    });

    describe('when GitHub conversion returns a 4xx error', () => {
      it('throws BadRequestException', async () => {
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
    });

    describe('when mode is shared', () => {
      it('throws BadRequestException', async () => {
        resolveGithubAppMode.mockResolvedValue('shared');

        await expect(
          service.completeGithubAppManifest({
            orgId,
            userId,
            code: 'gh-code-123',
            state: 'MANIFEST_STATE',
          }),
        ).rejects.toThrow(
          new BadRequestException(
            'Manifest flow is not available when a shared GitHub App is configured',
          ),
        );
      });
    });
  });

  describe('getGithubAppStatus', () => {
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

    describe('on shared mode', () => {
      let result: Awaited<ReturnType<typeof service.getGithubAppStatus>>;

      beforeEach(async () => {
        resolveGithubAppMode.mockResolvedValue('shared');

        result = await service.getGithubAppStatus({ orgId, userId });
      });

      it('returns hasApp true with zero linked providers', () => {
        expect(result).toEqual({ hasApp: true, linkedProviderCount: 0 });
      });

      it('does not call getActiveOrganizationGitHubApp', () => {
        expect(
          mockGitAdapter.getActiveOrganizationGitHubApp,
        ).not.toHaveBeenCalled();
      });
    });

    describe('on on-prem mode', () => {
      beforeEach(() => {
        resolveGithubAppMode.mockResolvedValue('on-prem');
      });

      describe('when active record exists', () => {
        describe('and no providers are linked', () => {
          it('returns hasApp true with appSlug and zero count', async () => {
            (
              mockGitAdapter.getActiveOrganizationGitHubApp as jest.Mock
            ).mockResolvedValue(activeApp);
            (mockGitAdapter.listProviders as jest.Mock).mockResolvedValue({
              providers: [],
            });

            const result = await service.getGithubAppStatus({ orgId, userId });

            expect(result).toEqual({
              hasApp: true,
              appSlug: 'my-packmind-app',
              revokedAt: null,
              linkedProviderCount: 0,
            });
          });
        });

        it('counts app-auth providers linked to the active record', async () => {
          (
            mockGitAdapter.getActiveOrganizationGitHubApp as jest.Mock
          ).mockResolvedValue(activeApp);
          (mockGitAdapter.listProviders as jest.Mock).mockResolvedValue({
            providers: [
              {
                id: 'prov-linked',
                source: 'github',
                authMethod: 'app',
                organizationId: orgId,
                url: null,
                token: null,
                displayName: '',
                organizationGitHubAppId: activeApp.id,
              },
              {
                id: 'prov-linked-2',
                source: 'github',
                authMethod: 'app',
                organizationId: orgId,
                url: null,
                token: null,
                displayName: '',
                organizationGitHubAppId: activeApp.id,
              },
              {
                id: 'prov-token',
                source: 'github',
                authMethod: 'token',
                organizationId: orgId,
                url: null,
                token: 'ghp_abc',
                displayName: '',
                organizationGitHubAppId: null,
              },
            ],
          });

          const result = await service.getGithubAppStatus({ orgId, userId });

          expect(result.linkedProviderCount).toBe(2);
        });
      });

      describe('when no active record exists', () => {
        it('returns hasApp false with zero count', async () => {
          (
            mockGitAdapter.getActiveOrganizationGitHubApp as jest.Mock
          ).mockResolvedValue(null);

          const result = await service.getGithubAppStatus({ orgId, userId });

          expect(result).toEqual({
            hasApp: false,
            revokedAt: null,
            linkedProviderCount: 0,
          });
        });
      });

      describe('when record has a revoked date', () => {
        it('returns revokedAt', async () => {
          const revokedAt = new Date('2025-01-01T00:00:00Z');
          (
            mockGitAdapter.getActiveOrganizationGitHubApp as jest.Mock
          ).mockResolvedValue({ ...activeApp, revokedAt });
          (mockGitAdapter.listProviders as jest.Mock).mockResolvedValue({
            providers: [],
          });

          const result = await service.getGithubAppStatus({ orgId, userId });

          expect(result).toEqual({
            hasApp: true,
            appSlug: 'my-packmind-app',
            revokedAt,
            linkedProviderCount: 0,
          });
        });
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

    describe('on on-prem mode', () => {
      beforeEach(() => {
        resolveGithubAppMode.mockResolvedValue('on-prem');
      });

      describe('when active record exists', () => {
        beforeEach(() => {
          (
            mockGitAdapter.getActiveOrganizationGitHubApp as jest.Mock
          ).mockResolvedValue(activeApp);
          (
            mockGitAdapter.revokeOrganizationGitHubApp as jest.Mock
          ).mockResolvedValue(undefined);
        });

        describe('when no linked providers remain', () => {
          describe('and the provider list is empty', () => {
            it('calls revokeOrganizationGitHubApp with the org id', async () => {
              (mockGitAdapter.listProviders as jest.Mock).mockResolvedValue({
                providers: [],
              });

              await service.revokeGithubApp({ orgId, userId });

              expect(
                mockGitAdapter.revokeOrganizationGitHubApp,
              ).toHaveBeenCalledWith(orgId);
            });
          });

          describe('and providers use token auth method', () => {
            it('calls revokeOrganizationGitHubApp', async () => {
              (mockGitAdapter.listProviders as jest.Mock).mockResolvedValue({
                providers: [
                  {
                    id: 'prov-token',
                    source: 'github',
                    authMethod: 'token',
                    organizationId: orgId,
                    url: null,
                    token: 'ghp_abc',
                    displayName: '',
                    organizationGitHubAppId: null,
                  },
                ],
              });

              await service.revokeGithubApp({ orgId, userId });

              expect(
                mockGitAdapter.revokeOrganizationGitHubApp,
              ).toHaveBeenCalledWith(orgId);
            });
          });

          describe('and app-auth providers reference a different app id', () => {
            it('calls revokeOrganizationGitHubApp', async () => {
              (mockGitAdapter.listProviders as jest.Mock).mockResolvedValue({
                providers: [
                  {
                    id: 'prov-other-app',
                    source: 'github',
                    authMethod: 'app',
                    organizationId: orgId,
                    url: null,
                    token: null,
                    displayName: '',
                    organizationGitHubAppId:
                      createOrganizationGitHubAppId('app-other'),
                  },
                ],
              });

              await service.revokeGithubApp({ orgId, userId });

              expect(
                mockGitAdapter.revokeOrganizationGitHubApp,
              ).toHaveBeenCalledWith(orgId);
            });
          });
        });

        describe('when linked providers still use the app', () => {
          it('throws BadRequestException mentioning the count', async () => {
            (mockGitAdapter.listProviders as jest.Mock).mockResolvedValue({
              providers: [
                {
                  id: 'prov-linked',
                  source: 'github',
                  authMethod: 'app',
                  organizationId: orgId,
                  url: null,
                  token: null,
                  displayName: '',
                  organizationGitHubAppId: activeApp.id,
                },
              ],
            });

            await expect(
              service.revokeGithubApp({ orgId, userId }),
            ).rejects.toThrow(
              new BadRequestException(
                'Cannot revoke the GitHub App: 1 connection(s) still use it. Delete those connections first.',
              ),
            );
          });

          it('does not call revokeOrganizationGitHubApp', async () => {
            (mockGitAdapter.listProviders as jest.Mock).mockResolvedValue({
              providers: [
                {
                  id: 'prov-linked',
                  source: 'github',
                  authMethod: 'app',
                  organizationId: orgId,
                  url: null,
                  token: null,
                  displayName: '',
                  organizationGitHubAppId: activeApp.id,
                },
              ],
            });

            await service
              .revokeGithubApp({ orgId, userId })
              .catch(() => undefined);

            expect(
              mockGitAdapter.revokeOrganizationGitHubApp,
            ).not.toHaveBeenCalled();
          });
        });
      });

      describe('when no active record exists', () => {
        it('throws NotFoundException', async () => {
          (
            mockGitAdapter.getActiveOrganizationGitHubApp as jest.Mock
          ).mockResolvedValue(null);

          await expect(
            service.revokeGithubApp({ orgId, userId }),
          ).rejects.toThrow(
            new NotFoundException(
              'No active GitHub App found for this organization',
            ),
          );
        });
      });
    });

    describe('when mode is shared', () => {
      beforeEach(() => {
        resolveGithubAppMode.mockResolvedValue('shared');
      });

      it('throws BadRequestException', async () => {
        await expect(
          service.revokeGithubApp({ orgId, userId }),
        ).rejects.toThrow(
          new BadRequestException(
            'GitHub App revocation is not available when a shared GitHub App is configured',
          ),
        );
      });

      it('does not call getActiveOrganizationGitHubApp', async () => {
        await service.revokeGithubApp({ orgId, userId }).catch(() => undefined);

        expect(
          mockGitAdapter.getActiveOrganizationGitHubApp,
        ).not.toHaveBeenCalled();
      });
    });
  });
});
