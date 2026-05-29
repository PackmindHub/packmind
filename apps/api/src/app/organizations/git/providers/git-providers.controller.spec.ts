// jest.mock calls are hoisted by jest before any imports.
// Mock the heavy import chains that load broken packages at test time.

jest.mock('../../../shared/utils/edition', () => ({
  resolvePackmindEdition: jest.fn(),
}));

// @packmind/accounts loads broken use case hierarchies at test time.
jest.mock('@packmind/accounts', () => ({
  AccountsHexa: class AccountsHexa {},
}));

// HexaInjection → HexaRegistryModule → @packmind/coding-agent (broken BaseHexa).
// Export all decorators used transitively by auth.service.ts and other services
// that are imported via the controller's dependencies.
jest.mock('../../../shared/HexaInjection', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Inject } = require('@nestjs/common');
  const makeDecorator = (token: string) => () => Inject(token);
  return {
    InjectGitAdapter: makeDecorator('GIT_ADAPTER'),
    InjectAccountsAdapter: makeDecorator('ACCOUNTS_ADAPTER'),
    InjectDeploymentAdapter: makeDecorator('DEPLOYMENT_ADAPTER'),
    InjectRecipesAdapter: makeDecorator('RECIPES_ADAPTER'),
    InjectSkillsAdapter: makeDecorator('SKILLS_ADAPTER'),
    InjectStandardsAdapter: makeDecorator('STANDARDS_ADAPTER'),
    InjectSpacesAdapter: makeDecorator('SPACES_ADAPTER'),
    InjectLinterAdapter: makeDecorator('LINTER_ADAPTER'),
    InjectSpacesManagementAdapter: makeDecorator('SPACES_MANAGEMENT_ADAPTER'),
    InjectCodingAgentAdapter: makeDecorator('CODING_AGENT_ADAPTER'),
    InjectLlmAdapter: makeDecorator('LLM_ADAPTER'),
    InjectHexaRegistry: makeDecorator('HEXA_REGISTRY'),
    createHexaInjector: (token: unknown) => makeDecorator(String(token)),
  };
});

// @packmind/git barrel loads GitHexa and other broken classes.
jest.mock('@packmind/git', () => {
  class InvalidInstallStateError extends Error {}
  class InstallStateSigner {}
  return { InvalidInstallStateError, InstallStateSigner };
});

jest.mock('@packmind/node-utils', () => ({
  Configuration: { getConfig: jest.fn() },
  AuthenticatedRequest: {},
}));

import { BadRequestException, NotImplementedException } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { createOrganizationId, createUserId } from '@packmind/types';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { GitProvidersController } from './git-providers.controller';
import { GitProvidersService } from './git-providers.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolvePackmindEdition } = require('../../../shared/utils/edition') as {
  resolvePackmindEdition: jest.Mock;
};

describe('GitProvidersController', () => {
  let controller: GitProvidersController;
  let mockService: jest.Mocked<
    Pick<
      GitProvidersService,
      | 'buildGithubAppInstallUrl'
      | 'completeGithubAppInstall'
      | 'buildGithubAppManifest'
      | 'completeGithubAppManifest'
      | 'getGithubAppStatus'
      | 'revokeGithubApp'
    >
  >;
  let logger: jest.Mocked<PackmindLogger>;

  const orgId = createOrganizationId('org-123');
  const userId = createUserId('user-456');
  const mockRequest = {
    user: { userId },
    clientSource: 'web',
  } as Partial<AuthenticatedRequest> as AuthenticatedRequest;

  beforeEach(() => {
    mockService = {
      buildGithubAppInstallUrl: jest.fn(),
      completeGithubAppInstall: jest.fn(),
      buildGithubAppManifest: jest.fn(),
      completeGithubAppManifest: jest.fn(),
      getGithubAppStatus: jest.fn(),
      revokeGithubApp: jest.fn(),
    };
    logger = stubLogger();

    controller = new GitProvidersController(
      mockService as unknown as GitProvidersService,
      {} as never,
      logger,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('getGithubAppInstallUrl', () => {
    it('calls the service and returns its result when edition is cloud', async () => {
      resolvePackmindEdition.mockResolvedValue('cloud');

      const expected = {
        installUrl:
          'https://github.com/apps/my-app/installations/new?state=abc',
        state: 'abc',
      };
      mockService.buildGithubAppInstallUrl.mockResolvedValue(expected);

      const result = await controller.getGithubAppInstallUrl(
        orgId,
        mockRequest,
      );

      expect(result).toBe(expected);
    });

    it('calls the service and returns its result when edition is oss', async () => {
      resolvePackmindEdition.mockResolvedValue('oss');

      const expected = {
        installUrl:
          'https://github.com/apps/my-oss-app/installations/new?state=abc',
        state: 'abc',
      };
      mockService.buildGithubAppInstallUrl.mockResolvedValue(expected);

      const result = await controller.getGithubAppInstallUrl(
        orgId,
        mockRequest,
      );

      expect(result).toBe(expected);
      expect(mockService.buildGithubAppInstallUrl).toHaveBeenCalledWith({
        organizationId: orgId,
        userId,
      });
    });
  });

  describe('completeGithubAppInstall', () => {
    it('calls the service with correct command and returns its result on happy path', async () => {
      const mockProvider = {
        id: 'prov-1',
        source: 'github',
        authMethod: 'app',
        appInstallationId: 99,
        organizationId: orgId,
        url: null,
        token: null,
      };
      mockService.completeGithubAppInstall.mockResolvedValue(
        mockProvider as never,
      );

      const body = { installationId: 99, state: 'valid-state' };
      const result = await controller.completeGithubAppInstall(
        orgId,
        mockRequest,
        body,
      );

      expect(result).toBe(mockProvider);
      expect(mockService.completeGithubAppInstall).toHaveBeenCalledWith({
        organizationId: orgId,
        userId,
        installationId: 99,
        state: 'valid-state',
        source: 'web',
      });
    });

    it('throws BadRequestException when state is missing', async () => {
      const body = { installationId: 1 } as {
        installationId: number;
        state: string;
      };

      await expect(
        controller.completeGithubAppInstall(orgId, mockRequest, body),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when state is empty string', async () => {
      const body = { installationId: 1, state: '' };

      await expect(
        controller.completeGithubAppInstall(orgId, mockRequest, body),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when installationId is missing', async () => {
      const body = { state: 'abc' } as {
        installationId: number;
        state: string;
      };

      await expect(
        controller.completeGithubAppInstall(orgId, mockRequest, body),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when installationId is not a number', async () => {
      const body = {
        installationId: 'not-a-number' as unknown as number,
        state: 'abc',
      };

      await expect(
        controller.completeGithubAppInstall(orgId, mockRequest, body),
      ).rejects.toThrow(BadRequestException);
    });

    it('propagates BadRequestException from service unchanged', async () => {
      mockService.completeGithubAppInstall.mockRejectedValue(
        new BadRequestException('Invalid or expired state token'),
      );

      await expect(
        controller.completeGithubAppInstall(orgId, mockRequest, {
          installationId: 1,
          state: 'some-state',
        }),
      ).rejects.toThrow(
        new BadRequestException('Invalid or expired state token'),
      );
    });
  });

  describe('getGithubAppManifest', () => {
    const manifestResponse = {
      manifest: {
        name: 'Packmind on Acme',
        url: 'https://app.example.com',
        redirect_url:
          'https://app.example.com/integrations/github-app/manifest-callback',
        setup_url:
          'https://app.example.com/integrations/github-app/install-callback',
        setup_on_update: true,
        hook_attributes: {
          url: 'https://app.example.com/api/v0/hooks/github-app',
        },
        public: false,
        default_permissions: {
          contents: 'write',
          metadata: 'read',
          pull_requests: 'write',
        },
        default_events: [],
      },
      state: 'STUB_STATE',
      manifestPostUrl: 'https://github.com/settings/apps/new',
    };

    it('returns manifest, state, and manifestPostUrl when edition is oss', async () => {
      resolvePackmindEdition.mockResolvedValue('oss');
      mockService.buildGithubAppManifest.mockResolvedValue(manifestResponse);

      const result = await controller.getGithubAppManifest(orgId, mockRequest);

      expect(result).toBe(manifestResponse);
    });

    it('calls the service with orgId and userId when edition is oss', async () => {
      resolvePackmindEdition.mockResolvedValue('oss');
      mockService.buildGithubAppManifest.mockResolvedValue(manifestResponse);

      await controller.getGithubAppManifest(orgId, mockRequest);

      expect(mockService.buildGithubAppManifest).toHaveBeenCalledWith({
        orgId,
        userId,
      });
    });

    it('throws NotImplementedException and does not call service when edition is cloud', async () => {
      resolvePackmindEdition.mockResolvedValue('cloud');

      await expect(
        controller.getGithubAppManifest(orgId, mockRequest),
      ).rejects.toThrow(NotImplementedException);

      expect(mockService.buildGithubAppManifest).not.toHaveBeenCalled();
    });
  });

  describe('completeGithubAppManifest', () => {
    const validBody = { code: 'gh-code-123', state: 'MANIFEST_STATE' };

    it('calls service and returns installUrl when edition is oss', async () => {
      resolvePackmindEdition.mockResolvedValue('oss');
      mockService.completeGithubAppManifest.mockResolvedValue({
        installUrl:
          'https://github.com/apps/my-app/installations/new?state=abc',
      });

      const result = await controller.completeGithubAppManifest(
        orgId,
        mockRequest,
        validBody,
      );

      expect(result).toEqual({
        installUrl:
          'https://github.com/apps/my-app/installations/new?state=abc',
      });
      expect(mockService.completeGithubAppManifest).toHaveBeenCalledWith({
        orgId,
        userId,
        code: 'gh-code-123',
        state: 'MANIFEST_STATE',
      });
    });

    it('throws NotImplementedException and does not call service when edition is cloud', async () => {
      resolvePackmindEdition.mockResolvedValue('cloud');

      await expect(
        controller.completeGithubAppManifest(orgId, mockRequest, validBody),
      ).rejects.toThrow(NotImplementedException);

      expect(mockService.completeGithubAppManifest).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when code is missing', async () => {
      resolvePackmindEdition.mockResolvedValue('oss');

      const body = { state: 'MANIFEST_STATE' } as {
        code: string;
        state: string;
      };

      await expect(
        controller.completeGithubAppManifest(orgId, mockRequest, body),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when code is empty string', async () => {
      resolvePackmindEdition.mockResolvedValue('oss');

      await expect(
        controller.completeGithubAppManifest(orgId, mockRequest, {
          code: '',
          state: 'MANIFEST_STATE',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when state is missing', async () => {
      resolvePackmindEdition.mockResolvedValue('oss');

      const body = { code: 'gh-code-123' } as {
        code: string;
        state: string;
      };

      await expect(
        controller.completeGithubAppManifest(orgId, mockRequest, body),
      ).rejects.toThrow(BadRequestException);
    });

    it('propagates BadRequestException from service unchanged', async () => {
      resolvePackmindEdition.mockResolvedValue('oss');
      mockService.completeGithubAppManifest.mockRejectedValue(
        new BadRequestException('Invalid manifest state'),
      );

      await expect(
        controller.completeGithubAppManifest(orgId, mockRequest, validBody),
      ).rejects.toThrow(new BadRequestException('Invalid manifest state'));
    });
  });

  describe('getGithubAppStatus', () => {
    it('returns service result on cloud edition', async () => {
      resolvePackmindEdition.mockResolvedValue('cloud');
      const expected = { hasApp: true };
      mockService.getGithubAppStatus.mockResolvedValue(expected);

      const result = await controller.getGithubAppStatus(orgId);

      expect(result).toBe(expected);
      expect(mockService.getGithubAppStatus).toHaveBeenCalledWith({ orgId });
    });

    it('returns service result with appSlug on oss edition when app exists', async () => {
      resolvePackmindEdition.mockResolvedValue('oss');
      const expected = {
        hasApp: true,
        appSlug: 'my-packmind-app',
        revokedAt: null,
      };
      mockService.getGithubAppStatus.mockResolvedValue(expected);

      const result = await controller.getGithubAppStatus(orgId);

      expect(result).toBe(expected);
      expect(mockService.getGithubAppStatus).toHaveBeenCalledWith({ orgId });
    });

    it('returns hasApp false when no app exists on oss edition', async () => {
      resolvePackmindEdition.mockResolvedValue('oss');
      const expected = { hasApp: false, appSlug: undefined, revokedAt: null };
      mockService.getGithubAppStatus.mockResolvedValue(expected);

      const result = await controller.getGithubAppStatus(orgId);

      expect(result).toBe(expected);
    });
  });

  describe('revokeGithubApp', () => {
    it('calls service and returns void on oss edition', async () => {
      resolvePackmindEdition.mockResolvedValue('oss');
      mockService.revokeGithubApp.mockResolvedValue(undefined);

      await controller.revokeGithubApp(orgId, mockRequest);

      expect(mockService.revokeGithubApp).toHaveBeenCalledWith({
        orgId,
        userId,
      });
    });

    it('throws NotImplementedException and does not call service when edition is cloud', async () => {
      resolvePackmindEdition.mockResolvedValue('cloud');

      await expect(
        controller.revokeGithubApp(orgId, mockRequest),
      ).rejects.toThrow(NotImplementedException);

      expect(mockService.revokeGithubApp).not.toHaveBeenCalled();
    });

    it('propagates NotFoundException from service unchanged', async () => {
      resolvePackmindEdition.mockResolvedValue('oss');
      mockService.revokeGithubApp.mockRejectedValue(
        new BadRequestException(
          'No active GitHub App found for this organization',
        ),
      );

      await expect(
        controller.revokeGithubApp(orgId, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
