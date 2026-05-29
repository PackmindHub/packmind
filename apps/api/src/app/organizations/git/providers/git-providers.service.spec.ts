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

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { GitProvidersService } from './git-providers.service';
import { INSTALL_STATE_SIGNER } from './git-providers.tokens';
import { createOrganizationId, createUserId, IGitPort } from '@packmind/types';
import { InvalidInstallStateError } from '@packmind/git';

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
    };

    mockSigner = {
      sign: jest.fn().mockReturnValue('STUB_STATE'),
      verify: jest.fn(),
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
          useValue: {},
        },
        {
          provide: INSTALL_STATE_SIGNER,
          useValue: mockSigner,
        },
      ],
    }).compile();

    service = module.get<GitProvidersService>(GitProvidersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('buildGithubAppInstallUrl', () => {
    it('returns installUrl and state when slug is configured', async () => {
      Configuration.getConfig.mockResolvedValue('packmind-cloud');
      const orgId = createOrganizationId('org-123');
      const userId = createUserId('user-456');

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

    it('calls signer.sign with string-cast orgId and userId', async () => {
      Configuration.getConfig.mockResolvedValue('packmind-cloud');
      const orgId = createOrganizationId('org-123');
      const userId = createUserId('user-456');

      await service.buildGithubAppInstallUrl({
        organizationId: orgId,
        userId,
      });

      expect(mockSigner.sign).toHaveBeenCalledWith({
        orgId: 'org-123',
        userId: 'user-456',
      });
    });

    it('throws InternalServerErrorException when slug is missing', async () => {
      Configuration.getConfig.mockResolvedValue(null);

      await expect(
        service.buildGithubAppInstallUrl({
          organizationId: createOrganizationId('org-1'),
          userId: createUserId('user-1'),
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('completeGithubAppInstall', () => {
    const orgId = createOrganizationId('org-123');
    const userId = createUserId('user-456');
    const validPayload = {
      orgId: 'org-123',
      userId: 'user-456',
      nonce: 'abc',
      exp: Math.floor(Date.now() / 1000) + 600,
    };

    it('calls gitAdapter.addGitProvider with correct app-method command', async () => {
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
          }),
          allowTokenlessProvider: true,
        }),
      );
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
});
