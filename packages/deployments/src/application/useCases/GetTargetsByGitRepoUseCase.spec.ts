import { GetTargetsByGitRepoUseCase } from './GetTargetsByGitRepoUseCase';
import { TargetService } from '../services/TargetService';
import {
  createGitRepoId,
  createOrganizationId,
  createTargetId,
  createUserId,
  GetTargetsByGitRepoCommand,
  Target,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';

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

    describe('when targets exist for repository', () => {
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
      let result: Target[];

      beforeEach(async () => {
        mockTargetService.getTargetsByGitRepoId.mockResolvedValue(mockTargets);
        result = await useCase.execute(mockCommand);
      });

      it('returns the targets', () => {
        expect(result).toEqual(mockTargets);
      });

      it('calls the target service with the git repo id', () => {
        expect(mockTargetService.getTargetsByGitRepoId).toHaveBeenCalledWith(
          mockCommand.gitRepoId,
        );
      });
    });

    describe('when no targets exist for repository', () => {
      let result: Target[];

      beforeEach(async () => {
        mockTargetService.getTargetsByGitRepoId.mockResolvedValue([]);
        result = await useCase.execute(mockCommand);
      });

      it('returns empty array', () => {
        expect(result).toEqual([]);
      });

      it('calls the target service with the git repo id', () => {
        expect(mockTargetService.getTargetsByGitRepoId).toHaveBeenCalledWith(
          mockCommand.gitRepoId,
        );
      });
    });

    describe('when repository errors occur', () => {
      const error = new Error('Database connection failed');

      beforeEach(async () => {
        mockTargetService.getTargetsByGitRepoId.mockRejectedValue(error);
        await expect(useCase.execute(mockCommand)).rejects.toThrow();
      });

      it('re-throws the error', async () => {
        await expect(useCase.execute(mockCommand)).rejects.toThrow(
          'Database connection failed',
        );
      });

      it('calls the target service with the git repo id', () => {
        expect(mockTargetService.getTargetsByGitRepoId).toHaveBeenCalledWith(
          mockCommand.gitRepoId,
        );
      });
    });

    describe('when non-Error exceptions occur', () => {
      beforeEach(() => {
        mockTargetService.getTargetsByGitRepoId.mockRejectedValue(
          'String error',
        );
      });

      it('re-throws the exception', async () => {
        await expect(useCase.execute(mockCommand)).rejects.toBe('String error');
      });
    });
  });
});
