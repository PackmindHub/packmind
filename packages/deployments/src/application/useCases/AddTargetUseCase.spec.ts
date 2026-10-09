import {
  mockInterface,
  createMockInstance,
  stubLogger,
} from '@packmind/test-utils';
import { AddTargetUseCase } from './AddTargetUseCase';
import {
  AddTargetCommand,
  ISyncDistributionsFromLockFilesUseCase,
  IGitPort,
  GitProviderMissingTokenError,
  GitProviderListItem,
  GitProviderVendors,
  Target,
  createTargetId,
  createGitRepoId,
  createGitProviderId,
  createUserId,
  createOrganizationId,
} from '@packmind/types';
import { gitRepoFactory } from '@packmind/git/test';
import { TargetService } from '../services/TargetService';
import { GitRepositoryNotFoundError } from '../../domain/errors/GitRepositoryNotFoundError';
import { InvalidTargetPathError } from '../../domain/errors/InvalidTargetPathError';
import { InvalidTargetNameError } from '../../domain/errors/InvalidTargetNameError';

describe('AddTargetUseCase', () => {
  let useCase: AddTargetUseCase;
  let mockTargetService: jest.Mocked<TargetService>;
  let mockGitPort: jest.Mocked<IGitPort>;
  let mockSyncDistributions: jest.Mocked<ISyncDistributionsFromLockFilesUseCase>;

  const userId = createUserId('user-123');
  const organizationId = createOrganizationId('org-123');
  const gitRepoId = createGitRepoId('repo-123');
  const providerId = createGitProviderId('provider-123');

  const mockRepo = gitRepoFactory({
    id: gitRepoId,
    owner: 'owner',
    repo: 'repo',
    branch: 'main',
    providerId,
  });

  const mockProviderWithToken: GitProviderListItem = {
    id: providerId,
    source: GitProviderVendors.github,
    organizationId,
    url: 'https://github.com',
    authMethod: 'token',
    displayName: 'github-provider',
    hasAuth: true,
    lastDistributionAt: null,
  };

  const mockProviderWithoutToken: GitProviderListItem = {
    id: providerId,
    source: GitProviderVendors.github,
    organizationId,
    url: 'https://github.com',
    authMethod: 'token',
    displayName: 'github-provider',
    hasAuth: false,
    lastDistributionAt: null,
  };

  beforeEach(() => {
    mockTargetService = createMockInstance(TargetService);

    mockGitPort = mockInterface<IGitPort>();

    mockSyncDistributions =
      mockInterface<ISyncDistributionsFromLockFilesUseCase>();
    mockSyncDistributions.execute.mockResolvedValue({
      targets: [],
    });

    useCase = new AddTargetUseCase(
      mockTargetService,
      mockGitPort,
      mockSyncDistributions,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when provider has a token', () => {
    beforeEach(() => {
      mockGitPort.getRepositoryById.mockResolvedValue(mockRepo);
      mockGitPort.listProviders.mockResolvedValue({
        providers: [mockProviderWithToken],
      });
    });

    describe('when creating target with valid name and path', () => {
      let result: Target;
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: 'production',
        path: '/src/',
        gitRepoId,
      };

      const expectedTarget: Target = {
        id: createTargetId('target-123'),
        name: 'production',
        path: '/src/',
        gitRepoId,
      };

      beforeEach(async () => {
        mockTargetService.addTarget.mockResolvedValue(expectedTarget);
        result = await useCase.execute(command);
      });

      it('calls addTarget with correct parameters', () => {
        expect(mockTargetService.addTarget).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'production',
            path: '/src/',
            gitRepoId,
          }),
        );
      });

      it('returns the created target', () => {
        expect(result).toEqual(expectedTarget);
      });

      it('does not sync an untracked repository', () => {
        expect(mockSyncDistributions.execute).not.toHaveBeenCalled();
      });
    });

    describe('when the repository is tracked', () => {
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: 'frontend',
        path: '/app/frontend/',
        gitRepoId,
      };
      const addedTarget: Target = {
        id: createTargetId('target-456'),
        name: 'frontend',
        path: '/app/frontend/',
        gitRepoId,
      };

      beforeEach(() => {
        mockGitPort.getRepositoryById.mockResolvedValue({
          ...mockRepo,
          isTracked: true,
        });
        mockTargetService.addTarget.mockResolvedValue(addedTarget);
      });

      describe('when the lock at the target path can be read', () => {
        beforeEach(async () => {
          await useCase.execute(command);
        });

        it('syncs the distribution state from the lock at that path only', () => {
          expect(mockSyncDistributions.execute).toHaveBeenCalledWith({
            userId,
            organizationId,
            gitRepoId,
            targetPaths: ['/app/frontend/'],
          });
        });
      });

      describe('when the lock cannot be read', () => {
        beforeEach(() => {
          mockSyncDistributions.execute.mockRejectedValue(
            new Error('Bad credentials'),
          );
        });

        it('still returns the created target', async () => {
          await expect(useCase.execute(command)).resolves.toEqual(addedTarget);
        });
      });
    });

    it('trims whitespace from target name', async () => {
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: '  production  ',
        path: '/src/',
        gitRepoId,
      };

      const expectedTarget: Target = {
        id: createTargetId('target-123'),
        name: 'production',
        path: '/src/',
        gitRepoId,
      };

      mockTargetService.addTarget.mockResolvedValue(expectedTarget);

      await useCase.execute(command);

      expect(mockTargetService.addTarget).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'production',
          path: '/src/',
          gitRepoId,
        }),
      );
    });

    it('accepts root path', async () => {
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: 'default',
        path: '/',
        gitRepoId,
      };

      const expectedTarget: Target = {
        id: createTargetId('target-123'),
        name: 'default',
        path: '/',
        gitRepoId,
      };

      mockTargetService.addTarget.mockResolvedValue(expectedTarget);

      await useCase.execute(command);

      expect(mockTargetService.addTarget).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'default',
          path: '/',
          gitRepoId,
        }),
      );
    });

    it('accepts relative paths', async () => {
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: 'frontend',
        path: '/apps/frontend/',
        gitRepoId,
      };

      const expectedTarget: Target = {
        id: createTargetId('target-123'),
        name: 'frontend',
        path: '/apps/frontend/',
        gitRepoId,
      };

      mockTargetService.addTarget.mockResolvedValue(expectedTarget);

      await useCase.execute(command);

      expect(mockTargetService.addTarget).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'frontend',
          path: '/apps/frontend/',
          gitRepoId,
        }),
      );
    });
  });

  describe('when provider has no token', () => {
    let thrownError: Error;
    const command: AddTargetCommand = {
      userId,
      organizationId,
      name: 'production',
      path: '/src/',
      gitRepoId,
    };

    beforeEach(async () => {
      mockGitPort.getRepositoryById.mockResolvedValue(mockRepo);
      mockGitPort.listProviders.mockResolvedValue({
        providers: [mockProviderWithoutToken],
      });

      try {
        await useCase.execute(command);
      } catch (error) {
        thrownError = error as Error;
      }
    });

    it('throws GitProviderMissingTokenError', () => {
      expect(thrownError).toBeInstanceOf(GitProviderMissingTokenError);
    });

    it('does not call addTarget', () => {
      expect(mockTargetService.addTarget).not.toHaveBeenCalled();
    });
  });

  describe('allowTokenlessProvider flag', () => {
    beforeEach(() => {
      mockGitPort.getRepositoryById.mockResolvedValue(mockRepo);
      mockGitPort.listProviders.mockResolvedValue({
        providers: [mockProviderWithoutToken],
      });
    });

    describe('when allowTokenlessProvider is true', () => {
      let result: Target;
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: 'production',
        path: '/src/',
        gitRepoId,
        allowTokenlessProvider: true,
      };

      const expectedTarget: Target = {
        id: createTargetId('target-123'),
        name: 'production',
        path: '/src/',
        gitRepoId,
      };

      beforeEach(async () => {
        mockTargetService.addTarget.mockResolvedValue(expectedTarget);
        result = await useCase.execute(command);
      });

      it('returns the created target', () => {
        expect(result).toEqual(expectedTarget);
      });

      it('calls addTarget', () => {
        expect(mockTargetService.addTarget).toHaveBeenCalled();
      });
    });

    describe('when allowTokenlessProvider is false', () => {
      let thrownError: Error;
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: 'production',
        path: '/src/',
        gitRepoId,
        allowTokenlessProvider: false,
      };

      beforeEach(async () => {
        try {
          await useCase.execute(command);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      it('throws GitProviderMissingTokenError', () => {
        expect(thrownError).toBeInstanceOf(GitProviderMissingTokenError);
      });

      it('does not call addTarget', () => {
        expect(mockTargetService.addTarget).not.toHaveBeenCalled();
      });
    });

    describe('when allowTokenlessProvider is not provided', () => {
      let thrownError: Error;
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: 'production',
        path: '/src/',
        gitRepoId,
      };

      beforeEach(async () => {
        try {
          await useCase.execute(command);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      it('throws GitProviderMissingTokenError', () => {
        expect(thrownError).toBeInstanceOf(GitProviderMissingTokenError);
      });

      it('does not call addTarget', () => {
        expect(mockTargetService.addTarget).not.toHaveBeenCalled();
      });
    });
  });

  describe('when validating input', () => {
    beforeEach(() => {
      mockGitPort.getRepositoryById.mockResolvedValue(mockRepo);
      mockGitPort.listProviders.mockResolvedValue({
        providers: [mockProviderWithToken],
      });
    });

    describe('when target name is empty', () => {
      let thrownError: Error;
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: '',
        path: '/src/',
        gitRepoId,
      };

      beforeEach(async () => {
        try {
          await useCase.execute(command);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      it('throws InvalidTargetNameError', () => {
        expect(thrownError).toBeInstanceOf(InvalidTargetNameError);
      });

      it('does not call addTarget', () => {
        expect(mockTargetService.addTarget).not.toHaveBeenCalled();
      });
    });

    describe('when target name is whitespace-only', () => {
      let thrownError: Error;
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: '   ',
        path: '/src/',
        gitRepoId,
      };

      beforeEach(async () => {
        try {
          await useCase.execute(command);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      it('throws InvalidTargetNameError', () => {
        expect(thrownError).toBeInstanceOf(InvalidTargetNameError);
      });

      it('does not call addTarget', () => {
        expect(mockTargetService.addTarget).not.toHaveBeenCalled();
      });
    });

    describe('when path is empty', () => {
      let thrownError: Error;
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: 'production',
        path: '',
        gitRepoId,
      };

      beforeEach(async () => {
        try {
          await useCase.execute(command);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      it('throws InvalidTargetPathError', () => {
        expect(thrownError).toBeInstanceOf(InvalidTargetPathError);
      });

      it('does not call addTarget', () => {
        expect(mockTargetService.addTarget).not.toHaveBeenCalled();
      });
    });

    describe('when path format is invalid', () => {
      let thrownError: Error;
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: 'production',
        path: '../invalid',
        gitRepoId,
      };

      beforeEach(async () => {
        try {
          await useCase.execute(command);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      it('throws InvalidTargetPathError', () => {
        expect(thrownError).toBeInstanceOf(InvalidTargetPathError);
      });

      it('does not call addTarget', () => {
        expect(mockTargetService.addTarget).not.toHaveBeenCalled();
      });
    });

    describe('when repository is not found', () => {
      let thrownError: Error;
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: 'production',
        path: '/src/',
        gitRepoId,
      };

      beforeEach(async () => {
        mockGitPort.getRepositoryById.mockResolvedValue(null);

        try {
          await useCase.execute(command);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      it('throws GitRepositoryNotFoundError', () => {
        expect(thrownError).toBeInstanceOf(GitRepositoryNotFoundError);
      });

      it('does not call addTarget', () => {
        expect(mockTargetService.addTarget).not.toHaveBeenCalled();
      });
    });
  });

  describe('when repository operations fail', () => {
    beforeEach(() => {
      mockGitPort.getRepositoryById.mockResolvedValue(mockRepo);
      mockGitPort.listProviders.mockResolvedValue({
        providers: [mockProviderWithToken],
      });
    });

    it('propagates repository errors', async () => {
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: 'production',
        path: '/src/',
        gitRepoId,
      };

      const repositoryError = new Error('Database connection failed');
      mockTargetService.addTarget.mockRejectedValue(repositoryError);

      await expect(useCase.execute(command)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
