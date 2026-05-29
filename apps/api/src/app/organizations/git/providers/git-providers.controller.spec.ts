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
      'buildGithubAppInstallUrl' | 'completeGithubAppInstall'
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

    it('throws NotImplementedException and does not call the service when edition is oss', async () => {
      resolvePackmindEdition.mockResolvedValue('oss');

      await expect(
        controller.getGithubAppInstallUrl(orgId, mockRequest),
      ).rejects.toThrow(NotImplementedException);

      expect(mockService.buildGithubAppInstallUrl).not.toHaveBeenCalled();
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
});
