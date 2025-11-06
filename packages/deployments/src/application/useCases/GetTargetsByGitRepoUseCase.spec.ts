import { GetTargetsByGitRepoUseCase } from './GetTargetsByGitRepoUseCase';
import { TargetService } from '../services/TargetService';
import { Target, GetTargetsByGitRepoCommand } from '@packmind/shared';
import { stubLogger } from '@packmind/test-utils';
import { createOrganizationId, createUserId } from '@packmind/types';
import { createTargetId, createGitRepoId } from '@packmind/shared';

describe('GetTargetsByGitRepoUseCase', () => {
  let useCase: GetTargetsByGitRepoUseCase;
  let mockTargetService: jest.Mocked<TargetService>;

  beforeEach(() => {
    mockTargetService = {
      getTargetsByGitRepoId: jest.fn(),
      addTarget: jest.fn(),
    } as unknown as jest.Mocked<TargetService>;

    useCase = new GetTargetsByGitRepoUseCase(mockTargetService, stubLogger());
  });

  describe('execute', () => {
    const mockCommand: GetTargetsByGitRepoCommand = {
      gitRepoId: createGitRepoId('repo-123'),
      organizationId: createOrganizationId('org-123'),
      userId: createUserId('user-123'),
    };

    it('returns targets for a repository', async () => {
      const mockTargets: Target[] = [
        {
          id: createTargetId('target-1'),
          name: 'Production',
          path: '/prod',
          gitRepoId: mockCommand.gitRepoId,
        },
        {
          id: createTargetId('target-2'),
          name: 'Staging',
          path: '/staging',
          gitRepoId: mockCommand.gitRepoId,
        },
      ];

      mockTargetService.getTargetsByGitRepoId.mockResolvedValue(mockTargets);

      const result = await useCase.execute(mockCommand);

      expect(result).toEqual(mockTargets);
      expect(mockTargetService.getTargetsByGitRepoId).toHaveBeenCalledWith(
        mockCommand.gitRepoId,
      );
    });

    describe('when no targets exist for repository', () => {
      it('returns empty array', async () => {
        mockTargetService.getTargetsByGitRepoId.mockResolvedValue([]);

        const result = await useCase.execute(mockCommand);

        expect(result).toEqual([]);
        expect(mockTargetService.getTargetsByGitRepoId).toHaveBeenCalledWith(
          mockCommand.gitRepoId,
        );
      });
    });

    describe('when repository errors occur', () => {
      it('re-throws the error', async () => {
        const error = new Error('Database connection failed');
        mockTargetService.getTargetsByGitRepoId.mockRejectedValue(error);

        await expect(useCase.execute(mockCommand)).rejects.toThrow(
          'Database connection failed',
        );

        expect(mockTargetService.getTargetsByGitRepoId).toHaveBeenCalledWith(
          mockCommand.gitRepoId,
        );
      });
    });

    describe('when non-Error exceptions occur', () => {
      it('re-throws the exception', async () => {
        const error = 'String error';
        mockTargetService.getTargetsByGitRepoId.mockRejectedValue(error);

        await expect(useCase.execute(mockCommand)).rejects.toBe('String error');
      });
    });
  });
});
