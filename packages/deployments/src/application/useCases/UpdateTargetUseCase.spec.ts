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

    let result: Target;

    beforeEach(async () => {
      mockTargetService.findById.mockResolvedValue(existingTarget);
      mockTargetService.updateTarget.mockResolvedValue(updatedTarget);

      result = await useCase.execute(command);
    });

    it('returns the updated target', () => {
      expect(result).toEqual(updatedTarget);
    });

    it('calls findById with the target id', () => {
      expect(mockTargetService.findById).toHaveBeenCalledWith(targetId);
    });

    it('does not call getRepositoryById', () => {
      expect(mockGitPort.getRepositoryById).not.toHaveBeenCalled();
    });

    it('does not call listProviders', () => {
      expect(mockGitPort.listProviders).not.toHaveBeenCalled();
    });

    it('calls updateTarget with correct parameters', () => {
      expect(mockTargetService.updateTarget).toHaveBeenCalledWith(targetId, {
        name: 'New Name',
        path: '/original/path/',
      });
    });
  });

  describe('when updating path', () => {
    describe('when provider has a token', () => {
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

      let result: Target;

      beforeEach(async () => {
        mockTargetService.findById.mockResolvedValue(existingTarget);
        mockGitPort.getRepositoryById.mockResolvedValue(mockRepo);
        mockGitPort.listProviders.mockResolvedValue({
          providers: [mockProviderWithToken],
        });
        mockTargetService.updateTarget.mockResolvedValue(updatedTarget);

        result = await useCase.execute(command);
      });

      it('returns the updated target', () => {
        expect(result).toEqual(updatedTarget);
      });

      it('calls getRepositoryById with the git repo id', () => {
        expect(mockGitPort.getRepositoryById).toHaveBeenCalledWith(gitRepoId);
      });

      it('calls listProviders with user and organization id', () => {
        expect(mockGitPort.listProviders).toHaveBeenCalledWith({
          userId,
          organizationId,
        });
      });

      it('calls updateTarget with correct parameters', () => {
        expect(mockTargetService.updateTarget).toHaveBeenCalledWith(targetId, {
          name: 'Original Name',
          path: '/new/path/',
        });
      });
    });

    describe('when provider has no token', () => {
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

      let thrownError: Error;

      beforeEach(async () => {
        mockTargetService.findById.mockResolvedValue(existingTarget);
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

      it('throws TargetPathUpdateForbiddenError', () => {
        expect(thrownError).toBeInstanceOf(TargetPathUpdateForbiddenError);
      });

      it('does not call updateTarget', () => {
        expect(mockTargetService.updateTarget).not.toHaveBeenCalled();
      });
    });
  });

  describe('validation errors', () => {
    describe('when name is empty', () => {
      const command: UpdateTargetCommand = {
        targetId,
        name: '',
        path: '/some/path/',
        userId,
        organizationId,
      };

      let thrownError: Error;

      beforeEach(async () => {
        try {
          await useCase.execute(command);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      it('throws error for empty name', () => {
        expect(thrownError.message).toBe('Target name cannot be empty');
      });

      it('does not call updateTarget', () => {
        expect(mockTargetService.updateTarget).not.toHaveBeenCalled();
      });
    });

    describe('when name is whitespace-only', () => {
      const command: UpdateTargetCommand = {
        targetId,
        name: '   ',
        path: '/some/path/',
        userId,
        organizationId,
      };

      let thrownError: Error;

      beforeEach(async () => {
        try {
          await useCase.execute(command);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      it('throws error for whitespace-only name', () => {
        expect(thrownError.message).toBe('Target name cannot be empty');
      });

      it('does not call updateTarget', () => {
        expect(mockTargetService.updateTarget).not.toHaveBeenCalled();
      });
    });

    describe('when path format is invalid', () => {
      const command: UpdateTargetCommand = {
        targetId,
        name: 'Valid Name',
        path: 'invalid-path',
        userId,
        organizationId,
      };

      let thrownError: Error;

      beforeEach(async () => {
        try {
          await useCase.execute(command);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      it('throws error for invalid path format', () => {
        expect(thrownError.message).toBe('Invalid path format');
      });

      it('does not call updateTarget', () => {
        expect(mockTargetService.updateTarget).not.toHaveBeenCalled();
      });
    });

    describe('when path contains traversal attempt', () => {
      const command: UpdateTargetCommand = {
        targetId,
        name: 'Valid Name',
        path: '/some/../path/',
        userId,
        organizationId,
      };

      let thrownError: Error;

      beforeEach(async () => {
        try {
          await useCase.execute(command);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      it('throws error for path traversal attempt', () => {
        expect(thrownError.message).toBe('Invalid path format');
      });

      it('does not call updateTarget', () => {
        expect(mockTargetService.updateTarget).not.toHaveBeenCalled();
      });
    });

    describe('when target is not found', () => {
      const command: UpdateTargetCommand = {
        targetId,
        name: 'Valid Name',
        path: '/',
        userId,
        organizationId,
      };

      let thrownError: Error;

      beforeEach(async () => {
        mockTargetService.findById.mockResolvedValue(null);

        try {
          await useCase.execute(command);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      it('throws error for target not found', () => {
        expect(thrownError.message).toBe(
          `Target with id ${targetId} not found`,
        );
      });

      it('does not call updateTarget', () => {
        expect(mockTargetService.updateTarget).not.toHaveBeenCalled();
      });
    });

    describe('when updating path', () => {
      const command: UpdateTargetCommand = {
        targetId,
        name: 'Valid Name',
        path: '/new/path/',
        userId,
        organizationId,
      };

      describe('when repository is not found', () => {
        let thrownError: Error;

        beforeEach(async () => {
          mockTargetService.findById.mockResolvedValue(existingTarget);
          mockGitPort.getRepositoryById.mockResolvedValue(null);

          try {
            await useCase.execute(command);
          } catch (error) {
            thrownError = error as Error;
          }
        });

        it('throws error for repository not found', () => {
          expect(thrownError.message).toBe(
            `Repository with id ${gitRepoId} not found`,
          );
        });

        it('does not call updateTarget', () => {
          expect(mockTargetService.updateTarget).not.toHaveBeenCalled();
        });
      });

      describe('when gitProvider does not have a token', () => {
        const localProviderId = createGitProviderId('provider-id');
        let thrownError: Error;

        beforeEach(async () => {
          mockTargetService.findById.mockResolvedValue(existingTarget);
          mockGitPort.getRepositoryById.mockResolvedValue({
            id: createGitRepoId('some-git-repo-id'),
            owner: 'some-company',
            repo: 'my-repo',
            branch: 'main',
            providerId: localProviderId,
          });
          mockGitPort.listProviders.mockResolvedValue({
            providers: [
              {
                id: localProviderId,
                source: 'github',
                hasToken: false,
                organizationId,
                url: 'https://github.com',
              },
            ],
          });

          try {
            await useCase.execute(command);
          } catch (error) {
            thrownError = error as Error;
          }
        });

        it('throws error if the gitProvider does not have a token', () => {
          expect(thrownError.message).toBe(
            `Cannot update path for target '${targetId}'. The associated git provider has no token configured.`,
          );
        });

        it('does not call updateTarget', () => {
          expect(mockTargetService.updateTarget).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('when path is root', () => {
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

    it('allows updating to root path if provider has token', async () => {
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
