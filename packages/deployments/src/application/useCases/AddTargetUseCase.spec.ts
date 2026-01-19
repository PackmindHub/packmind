import { AddTargetUseCase } from './AddTargetUseCase';
import {
  AddTargetCommand,
  IGitPort,
  GitProviderMissingTokenError,
  GitProviderWithoutToken,
  Target,
  createTargetId,
  createGitRepoId,
  createGitProviderId,
  createUserId,
  createOrganizationId,
} from '@packmind/types';
import { TargetService } from '../services/TargetService';

describe('AddTargetUseCase', () => {
  let useCase: AddTargetUseCase;
  let mockTargetService: jest.Mocked<TargetService>;
  let mockGitPort: jest.Mocked<IGitPort>;

  const userId = createUserId('user-123');
  const organizationId = createOrganizationId('org-123');
  const gitRepoId = createGitRepoId('repo-123');
  const providerId = createGitProviderId('provider-123');

  const mockRepo = {
    id: gitRepoId,
    owner: 'owner',
    repo: 'repo',
    branch: 'main',
    providerId,
  };

  const mockProviderWithToken: GitProviderWithoutToken = {
    id: providerId,
    source: 'github',
    organizationId,
    url: 'https://github.com',
    hasToken: true,
  };

  const mockProviderWithoutToken: GitProviderWithoutToken = {
    id: providerId,
    source: 'github',
    organizationId,
    url: 'https://github.com',
    hasToken: false,
  };

  beforeEach(() => {
    mockTargetService = {
      addTarget: jest.fn(),
      getTargetsByGitRepoId: jest.fn(),
    } as unknown as jest.Mocked<TargetService>;

    mockGitPort = {
      getRepositoryById: jest.fn(),
      listProviders: jest.fn(),
    } as unknown as jest.Mocked<IGitPort>;

    useCase = new AddTargetUseCase(mockTargetService, mockGitPort);
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

      it('throws error with correct message', () => {
        expect(thrownError.message).toBe('Target name cannot be empty');
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

      it('throws error with correct message', () => {
        expect(thrownError.message).toBe('Target name cannot be empty');
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

      it('throws error with correct message', () => {
        expect(thrownError.message).toBe('Invalid path format');
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

      it('throws error with correct message', () => {
        expect(thrownError.message).toBe('Invalid path format');
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

      it('throws error with correct message', () => {
        expect(thrownError.message).toBe(
          `Repository with id ${gitRepoId} not found`,
        );
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
