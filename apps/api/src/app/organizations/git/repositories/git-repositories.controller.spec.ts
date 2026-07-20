// jest.mock calls are hoisted by jest before any imports.
// Mock the heavy import chains that load broken packages at test time.

// HexaInjection → HexaRegistryModule → @packmind/coding-agent (broken BaseHexa).
jest.mock('../../../shared/HexaInjection', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Inject } = require('@nestjs/common');
  const makeDecorator = (token: string) => () => Inject(token);
  return {
    InjectGitAdapter: makeDecorator('GIT_ADAPTER'),
    InjectDeploymentAdapter: makeDecorator('DEPLOYMENT_ADAPTER'),
    InjectAccountsAdapter: makeDecorator('ACCOUNTS_ADAPTER'),
  };
});

// @packmind/node-utils pulls in Configuration/config chains at test time.
// Export a real OrganizationAdminRequiredError so the controller and this spec
// share the SAME class reference (instanceof checks must line up).
jest.mock('@packmind/node-utils', () => {
  class OrganizationAdminRequiredError extends Error {
    constructor(message = 'Organization admin required') {
      super(message);
      this.name = 'OrganizationAdminRequiredError';
    }
  }
  return {
    AuthenticatedRequest: {},
    OrganizationAdminRequiredError,
    isFeatureEnabled: jest.fn(),
  };
});

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  createGitRepoId,
  createOrganizationId,
  createUserId,
  GitRepo,
  NoTrackedRepositoryError,
  RepositoryAlreadyTrackedError,
} from '@packmind/types';
import { OrganizationAdminRequiredError } from '@packmind/node-utils';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { GitRepositoriesController } from './git-repositories.controller';
import { GitRepositoriesService } from './git-repositories.service';

describe('GitRepositoriesController tracked repository routes', () => {
  let controller: GitRepositoriesController;
  let mockService: jest.Mocked<
    Pick<
      GitRepositoriesService,
      | 'isTrackingFeatureEnabled'
      | 'getTrackedRepository'
      | 'setTrackedRepository'
      | 'updateTrackedBranch'
    >
  >;
  let logger: jest.Mocked<PackmindLogger>;

  const orgId = createOrganizationId('org-123');
  const userId = createUserId('user-456');
  const mockRequest = {
    user: { userId },
    clientSource: 'cli',
  } as Partial<AuthenticatedRequest> as AuthenticatedRequest;

  const trackedRepo: GitRepo = {
    id: createGitRepoId('repo-1'),
    owner: 'my-orga',
    repo: 'my-repo',
    branch: 'dev',
    providerId: undefined as never,
    isTracked: true,
  } as GitRepo;

  beforeEach(() => {
    mockService = {
      isTrackingFeatureEnabled: jest.fn().mockResolvedValue(true),
      getTrackedRepository: jest.fn(),
      setTrackedRepository: jest.fn(),
      updateTrackedBranch: jest.fn(),
    };
    logger = stubLogger();

    controller = new GitRepositoriesController(
      mockService as unknown as GitRepositoriesService,
      logger,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('getTrackedRepository', () => {
    describe('on happy path', () => {
      it('returns the tracked repository wrapper from the service', async () => {
        mockService.getTrackedRepository.mockResolvedValue({
          gitRepo: trackedRepo,
        });

        const result = await controller.getTrackedRepository(
          orgId,
          mockRequest,
          'my-orga',
          'my-repo',
        );

        expect(result).toEqual({ gitRepo: trackedRepo });
      });

      it('calls the service with the acting user, org, owner and repo', async () => {
        mockService.getTrackedRepository.mockResolvedValue({ gitRepo: null });

        await controller.getTrackedRepository(
          orgId,
          mockRequest,
          'my-orga',
          'my-repo',
        );

        expect(mockService.getTrackedRepository).toHaveBeenCalledWith(
          userId,
          orgId,
          'my-orga',
          'my-repo',
        );
      });
    });

    describe('when nothing is tracked', () => {
      it('returns a null wrapper', async () => {
        mockService.getTrackedRepository.mockResolvedValue({ gitRepo: null });

        const result = await controller.getTrackedRepository(
          orgId,
          mockRequest,
          'my-orga',
          'my-repo',
        );

        expect(result).toEqual({ gitRepo: null });
      });
    });

    describe('when the feature flag is disabled', () => {
      beforeEach(() => {
        mockService.isTrackingFeatureEnabled.mockResolvedValue(false);
      });

      it('throws a NotFoundException', async () => {
        await expect(
          controller.getTrackedRepository(
            orgId,
            mockRequest,
            'my-orga',
            'my-repo',
          ),
        ).rejects.toBeInstanceOf(NotFoundException);
      });

      it('does not call the tracking service method', async () => {
        await controller
          .getTrackedRepository(orgId, mockRequest, 'my-orga', 'my-repo')
          .catch(() => undefined);

        expect(mockService.getTrackedRepository).not.toHaveBeenCalled();
      });
    });
  });

  describe('setTrackedRepository', () => {
    const body = {
      owner: 'my-orga',
      repo: 'my-repo',
      branch: 'dev',
      origin: 'track' as const,
    };

    describe('on happy path', () => {
      it('returns the tracked repository', async () => {
        mockService.setTrackedRepository.mockResolvedValue(trackedRepo);

        const result = await controller.setTrackedRepository(
          orgId,
          mockRequest,
          body,
        );

        expect(result).toBe(trackedRepo);
      });

      it('calls the service with the command fields', async () => {
        mockService.setTrackedRepository.mockResolvedValue(trackedRepo);

        await controller.setTrackedRepository(orgId, mockRequest, {
          ...body,
          providerVendor: 'github',
          gitRemoteUrl: 'https://github.com/my-orga/my-repo.git',
        });

        expect(mockService.setTrackedRepository).toHaveBeenCalledWith(
          userId,
          orgId,
          'my-orga',
          'my-repo',
          'dev',
          'track',
          'github',
          'https://github.com/my-orga/my-repo.git',
        );
      });
    });

    describe('when the repository is already tracked on another branch', () => {
      it('maps RepositoryAlreadyTrackedError to a ConflictException', async () => {
        mockService.setTrackedRepository.mockRejectedValue(
          new RepositoryAlreadyTrackedError('my-orga', 'my-repo', 'main'),
        );

        await expect(
          controller.setTrackedRepository(orgId, mockRequest, body),
        ).rejects.toBeInstanceOf(ConflictException);
      });
    });

    describe('when the caller is not an organization admin', () => {
      it('maps OrganizationAdminRequiredError to a ForbiddenException', async () => {
        mockService.setTrackedRepository.mockRejectedValue(
          new OrganizationAdminRequiredError('Not an admin'),
        );

        await expect(
          controller.setTrackedRepository(orgId, mockRequest, body),
        ).rejects.toBeInstanceOf(ForbiddenException);
      });
    });

    describe('when the feature flag is disabled', () => {
      beforeEach(() => {
        mockService.isTrackingFeatureEnabled.mockResolvedValue(false);
      });

      it('throws a NotFoundException', async () => {
        await expect(
          controller.setTrackedRepository(orgId, mockRequest, body),
        ).rejects.toBeInstanceOf(NotFoundException);
      });

      it('does not call the service', async () => {
        await controller
          .setTrackedRepository(orgId, mockRequest, body)
          .catch(() => undefined);

        expect(mockService.setTrackedRepository).not.toHaveBeenCalled();
      });
    });
  });

  describe('updateTrackedBranch', () => {
    const body = { owner: 'my-orga', repo: 'my-repo', branch: 'dev' };

    describe('on happy path', () => {
      it('returns the newly tracked repository', async () => {
        mockService.updateTrackedBranch.mockResolvedValue(trackedRepo);

        const result = await controller.updateTrackedBranch(
          orgId,
          mockRequest,
          body,
        );

        expect(result).toBe(trackedRepo);
      });

      it('calls the service with the command fields', async () => {
        mockService.updateTrackedBranch.mockResolvedValue(trackedRepo);

        await controller.updateTrackedBranch(orgId, mockRequest, body);

        expect(mockService.updateTrackedBranch).toHaveBeenCalledWith(
          userId,
          orgId,
          'my-orga',
          'my-repo',
          'dev',
        );
      });
    });

    describe('when nothing is tracked yet', () => {
      it('maps NoTrackedRepositoryError to a ConflictException', async () => {
        mockService.updateTrackedBranch.mockRejectedValue(
          new NoTrackedRepositoryError('my-orga', 'my-repo'),
        );

        await expect(
          controller.updateTrackedBranch(orgId, mockRequest, body),
        ).rejects.toBeInstanceOf(ConflictException);
      });
    });

    describe('when the repository is already tracked on that branch', () => {
      it('maps RepositoryAlreadyTrackedError to a ConflictException', async () => {
        mockService.updateTrackedBranch.mockRejectedValue(
          new RepositoryAlreadyTrackedError('my-orga', 'my-repo', 'dev'),
        );

        await expect(
          controller.updateTrackedBranch(orgId, mockRequest, body),
        ).rejects.toBeInstanceOf(ConflictException);
      });
    });

    describe('when the caller is not an organization admin', () => {
      it('maps OrganizationAdminRequiredError to a ForbiddenException', async () => {
        mockService.updateTrackedBranch.mockRejectedValue(
          new OrganizationAdminRequiredError('Not an admin'),
        );

        await expect(
          controller.updateTrackedBranch(orgId, mockRequest, body),
        ).rejects.toBeInstanceOf(ForbiddenException);
      });
    });

    describe('when the feature flag is disabled', () => {
      beforeEach(() => {
        mockService.isTrackingFeatureEnabled.mockResolvedValue(false);
      });

      it('throws a NotFoundException', async () => {
        await expect(
          controller.updateTrackedBranch(orgId, mockRequest, body),
        ).rejects.toBeInstanceOf(NotFoundException);
      });

      it('does not call the service', async () => {
        await controller
          .updateTrackedBranch(orgId, mockRequest, body)
          .catch(() => undefined);

        expect(mockService.updateTrackedBranch).not.toHaveBeenCalled();
      });
    });
  });
});
