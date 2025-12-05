import { UpdateTargetUseCase } from './UpdateTargetUseCase';
import { TargetService } from '../services/TargetService';
import {
  Target,
  UpdateTargetCommand,
  createTargetId,
  createGitRepoId,
  createGitProviderId,
  createOrganizationId,
  createUserId,
  IGitPort,
  TargetPathUpdateForbiddenError,
  GitProviderWithoutToken,
} from '@packmind/types';

describe('UpdateTargetUseCase', () => {
  let useCase: UpdateTargetUseCase;
  let mockTargetService: jest.Mocked<TargetService>;
  let mockGitPort: jest.Mocked<IGitPort>;

  const targetId = createTargetId('target-123');
  const gitRepoId = createGitRepoId('repo-123');
  const providerId = createGitProviderId('provider-123');
  const organizationId = createOrganizationId('org-123');
  const userId = createUserId('user-123');

  const existingTarget: Target = {
    id: targetId,
    name: 'Original Name',
    path: '/original/path/',
    gitRepoId,
  };

  beforeEach(() => {
    mockTargetService = {
      findById: jest.fn(),
      updateTarget: jest.fn(),
    } as unknown as jest.Mocked<TargetService>;

    mockGitPort = {
      getRepositoryById: jest.fn(),
      listProviders: jest.fn(),
    } as unknown as jest.Mocked<IGitPort>;

    useCase = new UpdateTargetUseCase(mockTargetService, mockGitPort);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when updating name only', () => {
    it('updates the target without checking provider token', async () => {
      const command: UpdateTargetCommand = {
        targetId,
        name: 'New Name',
        path: '/original/path/',
        userId,
        organizationId,
      };

      const updatedTarget: Target = {
        ...existingTarget,
        name: 'New Name',
      };

      mockTargetService.findById.mockResolvedValue(existingTarget);
      mockTargetService.updateTarget.mockResolvedValue(updatedTarget);

      const result = await useCase.execute(command);

      expect(result).toEqual(updatedTarget);
      expect(mockTargetService.findById).toHaveBeenCalledWith(targetId);
      expect(mockGitPort.getRepositoryById).not.toHaveBeenCalled();
      expect(mockGitPort.listProviders).not.toHaveBeenCalled();
      expect(mockTargetService.updateTarget).toHaveBeenCalledWith(targetId, {
        name: 'New Name',
        path: '/original/path/',
      });
    });
  });

  describe('when updating path', () => {
    describe('when provider has a token', () => {
      it('updates the target path successfully', async () => {
        const command: UpdateTargetCommand = {
          targetId,
          name: 'Original Name',
          path: '/new/path/',
          userId,
          organizationId,
        };

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

        const updatedTarget: Target = {
          ...existingTarget,
          path: '/new/path/',
        };

        mockTargetService.findById.mockResolvedValue(existingTarget);
        mockGitPort.getRepositoryById.mockResolvedValue(mockRepo);
        mockGitPort.listProviders.mockResolvedValue({
          providers: [mockProviderWithToken],
        });
        mockTargetService.updateTarget.mockResolvedValue(updatedTarget);

        const result = await useCase.execute(command);

        expect(result).toEqual(updatedTarget);
        expect(mockGitPort.getRepositoryById).toHaveBeenCalledWith(gitRepoId);
        expect(mockGitPort.listProviders).toHaveBeenCalledWith({
          userId,
          organizationId,
        });
        expect(mockTargetService.updateTarget).toHaveBeenCalledWith(targetId, {
          name: 'Original Name',
          path: '/new/path/',
        });
      });
    });

    describe('when provider has no token', () => {
      it('throws TargetPathUpdateForbiddenError', async () => {
        const command: UpdateTargetCommand = {
          targetId,
          name: 'Original Name',
          path: '/new/path/',
          userId,
          organizationId,
        };

        const mockRepo = {
          id: gitRepoId,
          owner: 'owner',
          repo: 'repo',
          branch: 'main',
          providerId,
        };

        const mockProviderWithoutToken: GitProviderWithoutToken = {
          id: providerId,
          source: 'github',
          organizationId,
          url: 'https://github.com',
          hasToken: false,
        };

        mockTargetService.findById.mockResolvedValue(existingTarget);
        mockGitPort.getRepositoryById.mockResolvedValue(mockRepo);
        mockGitPort.listProviders.mockResolvedValue({
          providers: [mockProviderWithoutToken],
        });

        await expect(useCase.execute(command)).rejects.toThrow(
          TargetPathUpdateForbiddenError,
        );

        expect(mockTargetService.updateTarget).not.toHaveBeenCalled();
      });
    });
  });

  describe('validation errors', () => {
    it('throws error for empty name', async () => {
      const command: UpdateTargetCommand = {
        targetId,
        name: '',
        path: '/some/path/',
        userId,
        organizationId,
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'Target name cannot be empty',
      );

      expect(mockTargetService.updateTarget).not.toHaveBeenCalled();
    });

    it('throws error for whitespace-only name', async () => {
      const command: UpdateTargetCommand = {
        targetId,
        name: '   ',
        path: '/some/path/',
        userId,
        organizationId,
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'Target name cannot be empty',
      );

      expect(mockTargetService.updateTarget).not.toHaveBeenCalled();
    });

    it('throws error for invalid path format', async () => {
      const command: UpdateTargetCommand = {
        targetId,
        name: 'Valid Name',
        path: 'invalid-path',
        userId,
        organizationId,
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'Invalid path format',
      );

      expect(mockTargetService.updateTarget).not.toHaveBeenCalled();
    });

    it('throws error for path traversal attempt', async () => {
      const command: UpdateTargetCommand = {
        targetId,
        name: 'Valid Name',
        path: '/some/../path/',
        userId,
        organizationId,
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'Invalid path format',
      );

      expect(mockTargetService.updateTarget).not.toHaveBeenCalled();
    });

    it('throws error for target not found', async () => {
      const command: UpdateTargetCommand = {
        targetId,
        name: 'Valid Name',
        path: '/',
        userId,
        organizationId,
      };

      mockTargetService.findById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        `Target with id ${targetId} not found`,
      );

      expect(mockTargetService.updateTarget).not.toHaveBeenCalled();
    });

    it('throws error for repository not found when changing path', async () => {
      const command: UpdateTargetCommand = {
        targetId,
        name: 'Valid Name',
        path: '/new/path/',
        userId,
        organizationId,
      };

      mockTargetService.findById.mockResolvedValue(existingTarget);
      mockGitPort.getRepositoryById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        `Repository with id ${gitRepoId} not found`,
      );

      expect(mockTargetService.updateTarget).not.toHaveBeenCalled();
    });
  });

  describe('when path is root', () => {
    it('allows updating to root path when provider has token', async () => {
      const command: UpdateTargetCommand = {
        targetId,
        name: 'Root Target',
        path: '/',
        userId,
        organizationId,
      };

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

      const updatedTarget: Target = {
        ...existingTarget,
        name: 'Root Target',
        path: '/',
      };

      mockTargetService.findById.mockResolvedValue(existingTarget);
      mockGitPort.getRepositoryById.mockResolvedValue(mockRepo);
      mockGitPort.listProviders.mockResolvedValue({
        providers: [mockProviderWithToken],
      });
      mockTargetService.updateTarget.mockResolvedValue(updatedTarget);

      const result = await useCase.execute(command);

      expect(result).toEqual(updatedTarget);
    });
  });
});
