import { DeleteTargetUseCase } from './DeleteTargetUseCase';
import {
  DeleteTargetCommand,
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

describe('DeleteTargetUseCase', () => {
  let useCase: DeleteTargetUseCase;
  let mockTargetService: jest.Mocked<TargetService>;
  let mockGitPort: jest.Mocked<IGitPort>;

  const userId = createUserId('user-123');
  const organizationId = createOrganizationId('org-123');
  const gitRepoId = createGitRepoId('repo-123');
  const providerId = createGitProviderId('provider-123');
  const targetId = createTargetId('target-123');

  const mockTarget: Target = {
    id: targetId,
    name: 'production',
    path: '/src/',
    gitRepoId,
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

  const mockProviderWithoutToken: GitProviderWithoutToken = {
    id: providerId,
    source: 'github',
    organizationId,
    url: 'https://github.com',
    hasToken: false,
  };

  beforeEach(() => {
    mockTargetService = {
      findById: jest.fn(),
      deleteTarget: jest.fn(),
      getTargetsByGitRepoId: jest.fn(),
      addTarget: jest.fn(),
      updateTarget: jest.fn(),
    } as unknown as jest.Mocked<TargetService>;

    mockGitPort = {
      getRepositoryById: jest.fn(),
      listProviders: jest.fn(),
    } as unknown as jest.Mocked<IGitPort>;

    useCase = new DeleteTargetUseCase(mockTargetService, mockGitPort);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when provider has a token', () => {
    const command: DeleteTargetCommand = {
      userId,
      organizationId,
      targetId,
    };

    beforeEach(() => {
      mockTargetService.findById.mockResolvedValue(mockTarget);
      mockGitPort.getRepositoryById.mockResolvedValue(mockRepo);
      mockGitPort.listProviders.mockResolvedValue({
        providers: [mockProviderWithToken],
      });
      mockTargetService.deleteTarget.mockResolvedValue();
    });

    it('calls deleteTarget with the target ID', async () => {
      await useCase.execute(command);

      expect(mockTargetService.deleteTarget).toHaveBeenCalledWith(targetId);
    });

    it('returns success true', async () => {
      const result = await useCase.execute(command);

      expect(result).toEqual({ success: true });
    });
  });

  describe('when provider has no token', () => {
    const command: DeleteTargetCommand = {
      userId,
      organizationId,
      targetId,
    };

    beforeEach(() => {
      mockTargetService.findById.mockResolvedValue(mockTarget);
      mockGitPort.getRepositoryById.mockResolvedValue(mockRepo);
      mockGitPort.listProviders.mockResolvedValue({
        providers: [mockProviderWithoutToken],
      });
    });

    it('throws GitProviderMissingTokenError', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        GitProviderMissingTokenError,
      );
    });

    it('does not call deleteTarget', async () => {
      try {
        await useCase.execute(command);
      } catch {
        // Expected error
      }

      expect(mockTargetService.deleteTarget).not.toHaveBeenCalled();
    });
  });

  describe('when target not found', () => {
    const command: DeleteTargetCommand = {
      userId,
      organizationId,
      targetId,
    };

    beforeEach(() => {
      mockTargetService.findById.mockResolvedValue(null);
    });

    it('throws error for target not found', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        `Target with id ${targetId} not found`,
      );
    });

    it('does not call deleteTarget', async () => {
      try {
        await useCase.execute(command);
      } catch {
        // Expected error
      }

      expect(mockTargetService.deleteTarget).not.toHaveBeenCalled();
    });
  });

  describe('when repository not found', () => {
    const command: DeleteTargetCommand = {
      userId,
      organizationId,
      targetId,
    };

    beforeEach(() => {
      mockTargetService.findById.mockResolvedValue(mockTarget);
      mockGitPort.getRepositoryById.mockResolvedValue(null);
    });

    it('throws error for repository not found', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        `Repository with id ${gitRepoId} not found`,
      );
    });

    it('does not call deleteTarget', async () => {
      try {
        await useCase.execute(command);
      } catch {
        // Expected error
      }

      expect(mockTargetService.deleteTarget).not.toHaveBeenCalled();
    });
  });
});
