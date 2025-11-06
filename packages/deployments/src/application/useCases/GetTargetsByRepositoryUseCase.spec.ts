import { GetTargetsByRepositoryUseCase } from './GetTargetsByRepositoryUseCase';
import { TargetService } from '../services/TargetService';
import { GitHexa } from '@packmind/git';
import {
  Target,
  TargetWithRepository,
  GetTargetsByRepositoryCommand,
} from '@packmind/shared';
import { stubLogger } from '@packmind/test-utils';
import { createOrganizationId, createUserId } from '@packmind/types';
import {
  createTargetId,
  createGitRepoId,
  createGitProviderId,
} from '@packmind/shared';

describe('GetTargetsByRepositoryUseCase', () => {
  let useCase: GetTargetsByRepositoryUseCase;
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

    useCase = new GetTargetsByRepositoryUseCase(
      mockTargetService,
      mockGitHexa,
      stubLogger(),
    );
  });

  describe('execute', () => {
    const mockCommand: GetTargetsByRepositoryCommand = {
      owner: 'testowner',
      repo: 'testrepo',
      organizationId: createOrganizationId('org-123'),
      userId: createUserId('user-123'),
    };

    it('returns targets for a repository across all branches', async () => {
      const mockRepositories = [
        {
          id: createGitRepoId('repo-main'),
          owner: 'testowner',
          repo: 'testrepo',
          branch: 'main',
          providerId: createGitProviderId('provider-1'),
        },
        {
          id: createGitRepoId('repo-develop'),
          owner: 'testowner',
          repo: 'testrepo',
          branch: 'develop',
          providerId: createGitProviderId('provider-1'),
        },
        {
          id: createGitRepoId('repo-other'),
          owner: 'otherowner',
          repo: 'otherrepo',
          branch: 'main',
          providerId: createGitProviderId('provider-2'),
        },
      ];

      const mockTargetsMain: Target[] = [
        {
          id: createTargetId('target-1'),
          name: 'Production',
          path: '/prod',
          gitRepoId: createGitRepoId('repo-main'),
        },
      ];

      const mockTargetsDevelop: Target[] = [
        {
          id: createTargetId('target-2'),
          name: 'Staging',
          path: '/staging',
          gitRepoId: createGitRepoId('repo-develop'),
        },
      ];

      mockGitHexa.getOrganizationRepositories.mockResolvedValue(
        mockRepositories,
      );
      mockTargetService.getTargetsByGitRepoId
        .mockResolvedValueOnce(mockTargetsMain)
        .mockResolvedValueOnce(mockTargetsDevelop);

      const result = await useCase.execute(mockCommand);

      const expectedTargetsWithRepo: TargetWithRepository[] = [
        {
          ...mockTargetsMain[0],
          repository: {
            owner: 'testowner',
            repo: 'testrepo',
            branch: 'main',
          },
        },
        {
          ...mockTargetsDevelop[0],
          repository: {
            owner: 'testowner',
            repo: 'testrepo',
            branch: 'develop',
          },
        },
      ];

      expect(result).toEqual(expectedTargetsWithRepo);
      expect(mockGitHexa.getOrganizationRepositories).toHaveBeenCalledWith(
        mockCommand.organizationId,
      );
      expect(mockTargetService.getTargetsByGitRepoId).toHaveBeenCalledTimes(2);
      expect(mockTargetService.getTargetsByGitRepoId).toHaveBeenCalledWith(
        createGitRepoId('repo-main'),
      );
      expect(mockTargetService.getTargetsByGitRepoId).toHaveBeenCalledWith(
        createGitRepoId('repo-develop'),
      );
    });

    describe('when no repositories match owner/repo', () => {
      it('returns empty array', async () => {
        const mockRepositories = [
          {
            id: createGitRepoId('repo-other'),
            owner: 'otherowner',
            repo: 'otherrepo',
            branch: 'main',
            providerId: createGitProviderId('provider-1'),
          },
        ];

        mockGitHexa.getOrganizationRepositories.mockResolvedValue(
          mockRepositories,
        );

        const result = await useCase.execute(mockCommand);

        expect(result).toEqual([]);
        expect(mockGitHexa.getOrganizationRepositories).toHaveBeenCalledWith(
          mockCommand.organizationId,
        );
        expect(mockTargetService.getTargetsByGitRepoId).not.toHaveBeenCalled();
      });
    });

    describe('when matching repository has no targets', () => {
      it('returns empty array', async () => {
        const mockRepositories = [
          {
            id: createGitRepoId('repo-main'),
            owner: 'testowner',
            repo: 'testrepo',
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
          createGitRepoId('repo-main'),
        );
      });
    });

    describe('when repository errors occur', () => {
      it('re-throws the error', async () => {
        const error = new Error('Database connection failed');
        mockGitHexa.getOrganizationRepositories.mockRejectedValue(error);

        await expect(useCase.execute(mockCommand)).rejects.toThrow(
          'Database connection failed',
        );

        expect(mockGitHexa.getOrganizationRepositories).toHaveBeenCalledWith(
          mockCommand.organizationId,
        );
      });
    });

    describe('when target retrieval errors occur', () => {
      it('re-throws the error', async () => {
        const mockRepositories = [
          {
            id: createGitRepoId('repo-main'),
            owner: 'testowner',
            repo: 'testrepo',
            branch: 'main',
            providerId: createGitProviderId('provider-1'),
          },
        ];

        const error = new Error('Target retrieval failed');
        mockGitHexa.getOrganizationRepositories.mockResolvedValue(
          mockRepositories,
        );
        mockTargetService.getTargetsByGitRepoId.mockRejectedValue(error);

        await expect(useCase.execute(mockCommand)).rejects.toThrow(
          'Target retrieval failed',
        );

        expect(mockTargetService.getTargetsByGitRepoId).toHaveBeenCalledWith(
          createGitRepoId('repo-main'),
        );
      });
    });
  });
});
