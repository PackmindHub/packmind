// jest.mock calls are hoisted by jest before any imports.
// Mock the heavy import chains that load broken packages at test time.

jest.mock('../../../shared/utils/edition', () => ({
  resolveGithubAppMode: jest.fn(),
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

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotImplementedException,
} from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  GitProviderDisplayNameAlreadyUsedError,
  GitProviderDisplayNameNotEditableError,
  createGitProviderId,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { GitProvidersController } from './git-providers.controller';
import { GitProvidersService } from './git-providers.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveGithubAppMode } = require('../../../shared/utils/edition') as {
  resolveGithubAppMode: jest.Mock;
};

describe('GitProvidersController', () => {
  let controller: GitProvidersController;
  let mockService: jest.Mocked<
    Pick<
      GitProvidersService,
      | 'addGitProvider'
      | 'updateGitProvider'
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
      addGitProvider: jest.fn(),
      updateGitProvider: jest.fn(),
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
    describe('when mode is shared', () => {
      it('calls the service and returns its result', async () => {
        resolveGithubAppMode.mockResolvedValue('shared');

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
    });

    describe('when mode is on-prem', () => {
      const expected = {
        installUrl:
          'https://github.com/apps/my-oss-app/installations/new?state=abc',
        state: 'abc',
      };
      let result: Awaited<ReturnType<typeof controller.getGithubAppInstallUrl>>;

      beforeEach(async () => {
        resolveGithubAppMode.mockResolvedValue('on-prem');
        mockService.buildGithubAppInstallUrl.mockResolvedValue(expected);

        result = await controller.getGithubAppInstallUrl(orgId, mockRequest);
      });

      it('returns the service result', () => {
        expect(result).toBe(expected);
      });

      it('calls the service with the organizationId and userId', () => {
        expect(mockService.buildGithubAppInstallUrl).toHaveBeenCalledWith({
          organizationId: orgId,
          userId,
        });
      });
    });
  });

  describe('completeGithubAppInstall', () => {
    describe('on happy path', () => {
      const mockProvider = {
        id: 'prov-1',
        source: 'github',
        authMethod: 'app',
        appInstallationId: 99,
        organizationId: orgId,
        url: null,
        token: null,
      };
      let result: Awaited<
        ReturnType<typeof controller.completeGithubAppInstall>
      >;

      beforeEach(async () => {
        mockService.completeGithubAppInstall.mockResolvedValue(
          mockProvider as never,
        );

        const body = { installationId: 99, state: 'valid-state' };
        result = await controller.completeGithubAppInstall(
          orgId,
          mockRequest,
          body,
        );
      });

      it('returns the service result', () => {
        expect(result).toBe(mockProvider);
      });

      it('calls the service with the correct command', () => {
        expect(mockService.completeGithubAppInstall).toHaveBeenCalledWith({
          organizationId: orgId,
          userId,
          installationId: 99,
          state: 'valid-state',
          source: 'web',
        });
      });
    });

    describe('when state is missing', () => {
      it('throws BadRequestException', async () => {
        const body = { installationId: 1 } as {
          installationId: number;
          state: string;
        };

        await expect(
          controller.completeGithubAppInstall(orgId, mockRequest, body),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('when state is empty string', () => {
      it('throws BadRequestException', async () => {
        const body = { installationId: 1, state: '' };

        await expect(
          controller.completeGithubAppInstall(orgId, mockRequest, body),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('when installationId is missing', () => {
      it('throws BadRequestException', async () => {
        const body = { state: 'abc' } as {
          installationId: number;
          state: string;
        };

        await expect(
          controller.completeGithubAppInstall(orgId, mockRequest, body),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('when installationId is not a number', () => {
      it('throws BadRequestException', async () => {
        const body = {
          installationId: 'not-a-number' as unknown as number,
          state: 'abc',
        };

        await expect(
          controller.completeGithubAppInstall(orgId, mockRequest, body),
        ).rejects.toThrow(BadRequestException);
      });
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

    describe('when mode is on-prem', () => {
      beforeEach(() => {
        resolveGithubAppMode.mockResolvedValue('on-prem');
        mockService.buildGithubAppManifest.mockResolvedValue(manifestResponse);
      });

      it('returns manifest, state, and manifestPostUrl', async () => {
        const result = await controller.getGithubAppManifest(
          orgId,
          mockRequest,
        );

        expect(result).toBe(manifestResponse);
      });

      it('calls the service with orgId and userId', async () => {
        await controller.getGithubAppManifest(orgId, mockRequest);

        expect(mockService.buildGithubAppManifest).toHaveBeenCalledWith({
          orgId,
          userId,
        });
      });
    });

    describe('when mode is shared', () => {
      beforeEach(() => {
        resolveGithubAppMode.mockResolvedValue('shared');
      });

      it('throws NotImplementedException', async () => {
        await expect(
          controller.getGithubAppManifest(orgId, mockRequest),
        ).rejects.toThrow(NotImplementedException);
      });

      it('does not call service', async () => {
        await controller
          .getGithubAppManifest(orgId, mockRequest)
          .catch(() => undefined);

        expect(mockService.buildGithubAppManifest).not.toHaveBeenCalled();
      });
    });
  });

  describe('completeGithubAppManifest', () => {
    const validBody = { code: 'gh-code-123', state: 'MANIFEST_STATE' };

    describe('when mode is on-prem', () => {
      beforeEach(() => {
        resolveGithubAppMode.mockResolvedValue('on-prem');
      });

      describe('on happy path', () => {
        let result: Awaited<
          ReturnType<typeof controller.completeGithubAppManifest>
        >;

        beforeEach(async () => {
          mockService.completeGithubAppManifest.mockResolvedValue({
            installUrl:
              'https://github.com/apps/my-app/installations/new?state=abc',
          });

          result = await controller.completeGithubAppManifest(
            orgId,
            mockRequest,
            validBody,
          );
        });

        it('returns installUrl', () => {
          expect(result).toEqual({
            installUrl:
              'https://github.com/apps/my-app/installations/new?state=abc',
          });
        });

        it('calls the service with the correct command', () => {
          expect(mockService.completeGithubAppManifest).toHaveBeenCalledWith({
            orgId,
            userId,
            code: 'gh-code-123',
            state: 'MANIFEST_STATE',
          });
        });
      });

      describe('when code is missing', () => {
        it('throws BadRequestException', async () => {
          const body = { state: 'MANIFEST_STATE' } as {
            code: string;
            state: string;
          };

          await expect(
            controller.completeGithubAppManifest(orgId, mockRequest, body),
          ).rejects.toThrow(BadRequestException);
        });
      });

      describe('when code is empty string', () => {
        it('throws BadRequestException', async () => {
          await expect(
            controller.completeGithubAppManifest(orgId, mockRequest, {
              code: '',
              state: 'MANIFEST_STATE',
            }),
          ).rejects.toThrow(BadRequestException);
        });
      });

      describe('when state is missing', () => {
        it('throws BadRequestException', async () => {
          const body = { code: 'gh-code-123' } as {
            code: string;
            state: string;
          };

          await expect(
            controller.completeGithubAppManifest(orgId, mockRequest, body),
          ).rejects.toThrow(BadRequestException);
        });
      });

      it('propagates BadRequestException from service unchanged', async () => {
        mockService.completeGithubAppManifest.mockRejectedValue(
          new BadRequestException('Invalid manifest state'),
        );

        await expect(
          controller.completeGithubAppManifest(orgId, mockRequest, validBody),
        ).rejects.toThrow(new BadRequestException('Invalid manifest state'));
      });
    });

    describe('when mode is shared', () => {
      beforeEach(() => {
        resolveGithubAppMode.mockResolvedValue('shared');
      });

      it('throws NotImplementedException', async () => {
        await expect(
          controller.completeGithubAppManifest(orgId, mockRequest, validBody),
        ).rejects.toThrow(NotImplementedException);
      });

      it('does not call service', async () => {
        await controller
          .completeGithubAppManifest(orgId, mockRequest, validBody)
          .catch(() => undefined);

        expect(mockService.completeGithubAppManifest).not.toHaveBeenCalled();
      });
    });
  });

  describe('getGithubAppStatus', () => {
    describe('on cloud edition', () => {
      const expected = { hasApp: true };
      let result: Awaited<ReturnType<typeof controller.getGithubAppStatus>>;

      beforeEach(async () => {
        resolveGithubAppMode.mockResolvedValue('shared');
        mockService.getGithubAppStatus.mockResolvedValue(expected);

        result = await controller.getGithubAppStatus(orgId);
      });

      it('returns the service result', () => {
        expect(result).toBe(expected);
      });

      it('calls the service with orgId', () => {
        expect(mockService.getGithubAppStatus).toHaveBeenCalledWith({ orgId });
      });
    });

    describe('on oss edition', () => {
      beforeEach(() => {
        resolveGithubAppMode.mockResolvedValue('on-prem');
      });

      describe('when app exists', () => {
        const expected = {
          hasApp: true,
          appSlug: 'my-packmind-app',
          revokedAt: null,
        };
        let result: Awaited<ReturnType<typeof controller.getGithubAppStatus>>;

        beforeEach(async () => {
          mockService.getGithubAppStatus.mockResolvedValue(expected);

          result = await controller.getGithubAppStatus(orgId);
        });

        it('returns the service result with appSlug', () => {
          expect(result).toBe(expected);
        });

        it('calls the service with orgId', () => {
          expect(mockService.getGithubAppStatus).toHaveBeenCalledWith({
            orgId,
          });
        });
      });

      describe('when no app exists', () => {
        it('returns hasApp false', async () => {
          const expected = {
            hasApp: false,
            appSlug: undefined,
            revokedAt: null,
          };
          mockService.getGithubAppStatus.mockResolvedValue(expected);

          const result = await controller.getGithubAppStatus(orgId);

          expect(result).toBe(expected);
        });
      });
    });
  });

  describe('revokeGithubApp', () => {
    describe('on oss edition', () => {
      beforeEach(() => {
        resolveGithubAppMode.mockResolvedValue('on-prem');
      });

      it('calls service and returns void', async () => {
        mockService.revokeGithubApp.mockResolvedValue(undefined);

        await controller.revokeGithubApp(orgId, mockRequest);

        expect(mockService.revokeGithubApp).toHaveBeenCalledWith({
          orgId,
          userId,
        });
      });

      it('propagates NotFoundException from service unchanged', async () => {
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

    describe('when mode is shared', () => {
      beforeEach(() => {
        resolveGithubAppMode.mockResolvedValue('shared');
      });

      it('throws NotImplementedException', async () => {
        await expect(
          controller.revokeGithubApp(orgId, mockRequest),
        ).rejects.toThrow(NotImplementedException);
      });

      it('does not call service', async () => {
        await controller
          .revokeGithubApp(orgId, mockRequest)
          .catch(() => undefined);

        expect(mockService.revokeGithubApp).not.toHaveBeenCalled();
      });
    });
  });

  describe('addGitProvider', () => {
    const body = {
      source: 'github' as const,
      url: 'https://github.com',
      token: 'tok',
      authMethod: 'token' as const,
      displayName: 'Production',
      organizationId: orgId,
    };

    describe('when the display name collides with an existing provider', () => {
      it('translates the domain error into a 409 Conflict', async () => {
        mockService.addGitProvider.mockRejectedValue(
          new GitProviderDisplayNameAlreadyUsedError('Production', orgId),
        );

        await expect(
          controller.addGitProvider(orgId, mockRequest, body),
        ).rejects.toBeInstanceOf(ConflictException);
      });
    });
  });

  describe('updateGitProvider', () => {
    const providerId = createGitProviderId('prov-1');
    const body = { displayName: 'Marketplace' };

    describe('when the display name collides with another provider', () => {
      it('translates the domain error into a 409 Conflict', async () => {
        mockService.updateGitProvider.mockRejectedValue(
          new GitProviderDisplayNameAlreadyUsedError('Marketplace', orgId),
        );

        await expect(
          controller.updateGitProvider(orgId, mockRequest, providerId, body),
        ).rejects.toBeInstanceOf(ConflictException);
      });
    });

    describe('when editing a CLI-managed provider', () => {
      it('translates the domain error into a 403 Forbidden', async () => {
        mockService.updateGitProvider.mockRejectedValue(
          new GitProviderDisplayNameNotEditableError(providerId),
        );

        await expect(
          controller.updateGitProvider(orgId, mockRequest, providerId, body),
        ).rejects.toBeInstanceOf(ForbiddenException);
      });
    });
  });
});
