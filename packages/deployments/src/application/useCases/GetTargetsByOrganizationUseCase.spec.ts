import { GetTargetsByOrganizationUseCase } from './GetTargetsByOrganizationUseCase';
import { TargetService } from '../services/TargetService';
import { GitHexa } from '@packmind/git';
import {
  Target,
  TargetWithRepository,
  GetTargetsByOrganizationCommand,
  createTargetId,
  createGitRepoId,
  createGitProviderId,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { createOrganizationId, createUserId } from '@packmind/types';

describe('GetTargetsByOrganizationUseCase', () => {
  let useCase: GetTargetsByOrganizationUseCase;
  let mockTargetService: jest.Mocked<TargetService>;
  let mockGitHexa: jest.Mocked<GitHexa>;

  beforeEach(() => {
    mockTargetService = {
      getTargetsByGitRepoId: jest.fn(),
      addTarget: jest.fn(),
    } as unknown as jest.Mocked<TargetService>;

    mockGitHexa = {
      getOrganizationRepositories: jest.fn(),
    } as unknown as jest.Mocked<GitHexa>;

    useCase = new GetTargetsByOrganizationUseCase(
      mockTargetService,
      mockGitHexa,
      stubLogger(),
    );
  });

  describe('execute', () => {
    const mockCommand: GetTargetsByOrganizationCommand = {
      organizationId: createOrganizationId('org-123'),
      userId: createUserId('user-123'),
    };

    it('returns all targets for all repositories in an organization', async () => {
      const mockRepositories = [
        {
          id: createGitRepoId('repo-1'),
          owner: 'owner1',
          repo: 'repo1',
          branch: 'main',
          providerId: createGitProviderId('provider-1'),
        },
        {
          id: createGitRepoId('repo-2'),
          owner: 'owner2',
          repo: 'repo2',
          branch: 'main',
          providerId: createGitProviderId('provider-2'),
        },
      ];

      const mockTargetsRepo1: Target[] = [
        {
          id: createTargetId('target-1'),
          name: 'Production',
          path: '/prod',
          gitRepoId: createGitRepoId('repo-1'),
        },
      ];

      const mockTargetsRepo2: Target[] = [
        {
          id: createTargetId('target-2'),
          name: 'Staging',
          path: '/staging',
          gitRepoId: createGitRepoId('repo-2'),
        },
        {
          id: createTargetId('target-3'),
          name: 'Development',
          path: '/dev',
          gitRepoId: createGitRepoId('repo-2'),
        },
      ];

      mockGitHexa.getOrganizationRepositories.mockResolvedValue(
        mockRepositories,
      );
      mockTargetService.getTargetsByGitRepoId
        .mockResolvedValueOnce(mockTargetsRepo1)
        .mockResolvedValueOnce(mockTargetsRepo2);

      const result = await useCase.execute(mockCommand);

      const expectedTargetsWithRepo: TargetWithRepository[] = [
        {
          ...mockTargetsRepo1[0],
          repository: {
            owner: mockRepositories[0].owner,
            repo: mockRepositories[0].repo,
            branch: mockRepositories[0].branch,
          },
        },
        {
          ...mockTargetsRepo2[0],
          repository: {
            owner: mockRepositories[1].owner,
            repo: mockRepositories[1].repo,
            branch: mockRepositories[1].branch,
          },
        },
        {
          ...mockTargetsRepo2[1],
          repository: {
            owner: mockRepositories[1].owner,
            repo: mockRepositories[1].repo,
            branch: mockRepositories[1].branch,
          },
        },
      ];

      expect(result).toEqual(expectedTargetsWithRepo);
      expect(mockGitHexa.getOrganizationRepositories).toHaveBeenCalledWith(
        mockCommand.organizationId,
      );
      expect(mockTargetService.getTargetsByGitRepoId).toHaveBeenCalledTimes(2);
      expect(mockTargetService.getTargetsByGitRepoId).toHaveBeenCalledWith(
        mockRepositories[0].id,
      );
      expect(mockTargetService.getTargetsByGitRepoId).toHaveBeenCalledWith(
        mockRepositories[1].id,
      );
    });

    describe('when no repositories exist for organization', () => {
      it('returns empty array', async () => {
        mockGitHexa.getOrganizationRepositories.mockResolvedValue([]);

        const result = await useCase.execute(mockCommand);

        expect(result).toEqual([]);
        expect(mockGitHexa.getOrganizationRepositories).toHaveBeenCalledWith(
          mockCommand.organizationId,
        );
        expect(mockTargetService.getTargetsByGitRepoId).not.toHaveBeenCalled();
      });
    });

    describe('when repositories have no targets', () => {
      it('returns empty array', async () => {
        const mockRepositories = [
          {
            id: createGitRepoId('repo-1'),
            owner: 'owner1',
            repo: 'repo1',
            branch: 'main',
            providerId: createGitProviderId('provider-1'),
          },
        ];

        mockGitHexa.getOrganizationRepositories.mockResolvedValue(
          mockRepositories,
        );
        mockTargetService.getTargetsByGitRepoId.mockResolvedValue([]);

        const result = await useCase.execute(mockCommand);

        expect(result).toEqual([]);
        expect(mockTargetService.getTargetsByGitRepoId).toHaveBeenCalledWith(
          mockRepositories[0].id,
        );
      });
    });

    describe('when git hexa errors occur', () => {
      it('re-throws the error', async () => {
        const error = new Error('Git service unavailable');
        mockGitHexa.getOrganizationRepositories.mockRejectedValue(error);

        await expect(useCase.execute(mockCommand)).rejects.toThrow(
          'Git service unavailable',
        );

        expect(mockGitHexa.getOrganizationRepositories).toHaveBeenCalledWith(
          mockCommand.organizationId,
        );
      });
    });

    describe('when target service errors occur', () => {
      it('re-throws the error', async () => {
        const mockRepositories = [
          {
            id: createGitRepoId('repo-1'),
            owner: 'owner1',
            repo: 'repo1',
            branch: 'main',
            providerId: createGitProviderId('provider-1'),
          },
        ];

        const error = new Error('Database connection failed');
        mockGitHexa.getOrganizationRepositories.mockResolvedValue(
          mockRepositories,
        );
        mockTargetService.getTargetsByGitRepoId.mockRejectedValue(error);

        await expect(useCase.execute(mockCommand)).rejects.toThrow(
          'Database connection failed',
        );

        expect(mockTargetService.getTargetsByGitRepoId).toHaveBeenCalledWith(
          mockRepositories[0].id,
        );
      });
    });
  });
});
