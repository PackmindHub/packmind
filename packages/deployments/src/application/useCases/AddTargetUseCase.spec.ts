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

    it('creates target with valid name and path', async () => {
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

      mockTargetService.addTarget.mockResolvedValue(expectedTarget);

      const result = await useCase.execute(command);

      expect(mockTargetService.addTarget).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'production',
          path: '/src/',
          gitRepoId,
        }),
      );
      expect(result).toEqual(expectedTarget);
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
    beforeEach(() => {
      mockGitPort.getRepositoryById.mockResolvedValue(mockRepo);
      mockGitPort.listProviders.mockResolvedValue({
        providers: [mockProviderWithoutToken],
      });
    });

    it('throws GitProviderMissingTokenError', async () => {
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: 'production',
        path: '/src/',
        gitRepoId,
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        GitProviderMissingTokenError,
      );

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

    it('allows tokenless provider if allowTokenlessProvider is true', async () => {
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

      mockTargetService.addTarget.mockResolvedValue(expectedTarget);

      const result = await useCase.execute(command);

      expect(result).toEqual(expectedTarget);
      expect(mockTargetService.addTarget).toHaveBeenCalled();
    });

    it('rejects tokenless provider if allowTokenlessProvider is false', async () => {
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: 'production',
        path: '/src/',
        gitRepoId,
        allowTokenlessProvider: false,
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        GitProviderMissingTokenError,
      );

      expect(mockTargetService.addTarget).not.toHaveBeenCalled();
    });

    it('rejects tokenless provider if allowTokenlessProvider is not provided', async () => {
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: 'production',
        path: '/src/',
        gitRepoId,
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        GitProviderMissingTokenError,
      );

      expect(mockTargetService.addTarget).not.toHaveBeenCalled();
    });
  });

  describe('when validating input', () => {
    beforeEach(() => {
      mockGitPort.getRepositoryById.mockResolvedValue(mockRepo);
      mockGitPort.listProviders.mockResolvedValue({
        providers: [mockProviderWithToken],
      });
    });

    it('throws error for empty target name', async () => {
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: '',
        path: '/src/',
        gitRepoId,
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'Target name cannot be empty',
      );

      expect(mockTargetService.addTarget).not.toHaveBeenCalled();
    });

    it('throws error for whitespace-only target name', async () => {
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: '   ',
        path: '/src/',
        gitRepoId,
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'Target name cannot be empty',
      );

      expect(mockTargetService.addTarget).not.toHaveBeenCalled();
    });

    it('throws error for empty path', async () => {
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: 'production',
        path: '',
        gitRepoId,
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'Invalid path format',
      );

      expect(mockTargetService.addTarget).not.toHaveBeenCalled();
    });

    it('throws error for invalid path format', async () => {
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: 'production',
        path: '../invalid',
        gitRepoId,
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'Invalid path format',
      );

      expect(mockTargetService.addTarget).not.toHaveBeenCalled();
    });

    it('throws error for repository not found', async () => {
      mockGitPort.getRepositoryById.mockResolvedValue(null);

      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: 'production',
        path: '/src/',
        gitRepoId,
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        `Repository with id ${gitRepoId} not found`,
      );

      expect(mockTargetService.addTarget).not.toHaveBeenCalled();
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
