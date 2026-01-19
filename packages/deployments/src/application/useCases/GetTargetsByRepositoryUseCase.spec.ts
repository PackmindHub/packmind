import { GetTargetsByRepositoryUseCase } from './GetTargetsByRepositoryUseCase';
import { TargetService } from '../services/TargetService';
import {
  Target,
  TargetWithRepository,
  GetTargetsByRepositoryCommand,
  createTargetId,
  createGitRepoId,
  createGitProviderId,
  IGitPort,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { createOrganizationId, createUserId } from '@packmind/types';

describe('GetTargetsByRepositoryUseCase', () => {
  let useCase: GetTargetsByRepositoryUseCase;
  let mockTargetService: jest.Mocked<TargetService>;
  let mockGitPort: jest.Mocked<IGitPort>;

  beforeEach(() => {
    mockTargetService = {
      getTargetsByGitRepoId: jest.fn(),
      addTarget: jest.fn(),
    } as unknown as jest.Mocked<TargetService>;

    mockGitPort = {
      getOrganizationRepositories: jest.fn(),
    } as unknown as jest.Mocked<IGitPort>;

    useCase = new GetTargetsByRepositoryUseCase(
      mockTargetService,
      mockGitPort,
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

    describe('when repository has targets across multiple branches', () => {
      let result: TargetWithRepository[];
      let mockTargetsMain: Target[];
      let mockTargetsDevelop: Target[];

      beforeEach(async () => {
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

        mockTargetsMain = [
          {
            id: createTargetId('target-1'),
            name: 'Production',
            path: '/prod',
            gitRepoId: createGitRepoId('repo-main'),
          },
        ];

        mockTargetsDevelop = [
          {
            id: createTargetId('target-2'),
            name: 'Staging',
            path: '/staging',
            gitRepoId: createGitRepoId('repo-develop'),
          },
        ];

        mockGitPort.getOrganizationRepositories.mockResolvedValue(
          mockRepositories,
        );
        mockTargetService.getTargetsByGitRepoId
          .mockResolvedValueOnce(mockTargetsMain)
          .mockResolvedValueOnce(mockTargetsDevelop);

        result = await useCase.execute(mockCommand);
      });

      it('returns targets with repository information', () => {
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
      });

      it('fetches organization repositories', () => {
        expect(mockGitPort.getOrganizationRepositories).toHaveBeenCalledWith(
          mockCommand.organizationId,
        );
      });

      it('fetches targets for each matching repository', () => {
        expect(mockTargetService.getTargetsByGitRepoId).toHaveBeenCalledTimes(
          2,
        );
      });

      it('fetches targets for main branch repository', () => {
        expect(mockTargetService.getTargetsByGitRepoId).toHaveBeenCalledWith(
          createGitRepoId('repo-main'),
        );
      });

      it('fetches targets for develop branch repository', () => {
        expect(mockTargetService.getTargetsByGitRepoId).toHaveBeenCalledWith(
          createGitRepoId('repo-develop'),
        );
      });
    });

    describe('when no repositories match owner/repo', () => {
      let result: TargetWithRepository[];

      beforeEach(async () => {
        const mockRepositories = [
          {
            id: createGitRepoId('repo-other'),
            owner: 'otherowner',
            repo: 'otherrepo',
            branch: 'main',
            providerId: createGitProviderId('provider-1'),
          },
        ];

        mockGitPort.getOrganizationRepositories.mockResolvedValue(
          mockRepositories,
        );

        result = await useCase.execute(mockCommand);
      });

      it('returns empty array', () => {
        expect(result).toEqual([]);
      });

      it('fetches organization repositories', () => {
        expect(mockGitPort.getOrganizationRepositories).toHaveBeenCalledWith(
          mockCommand.organizationId,
        );
      });

      it('does not fetch targets', () => {
        expect(mockTargetService.getTargetsByGitRepoId).not.toHaveBeenCalled();
      });
    });

    describe('when matching repository has no targets', () => {
      let result: TargetWithRepository[];

      beforeEach(async () => {
        const mockRepositories = [
          {
            id: createGitRepoId('repo-main'),
            owner: 'testowner',
            repo: 'testrepo',
            branch: 'main',
            providerId: createGitProviderId('provider-1'),
          },
        ];

        mockGitPort.getOrganizationRepositories.mockResolvedValue(
          mockRepositories,
        );
        mockTargetService.getTargetsByGitRepoId.mockResolvedValue([]);

        result = await useCase.execute(mockCommand);
      });

      it('returns empty array', () => {
        expect(result).toEqual([]);
      });

      it('fetches targets for the matching repository', () => {
        expect(mockTargetService.getTargetsByGitRepoId).toHaveBeenCalledWith(
          createGitRepoId('repo-main'),
        );
      });
    });

    describe('when repository errors occur', () => {
      let executePromise: Promise<TargetWithRepository[]>;

      beforeEach(() => {
        const error = new Error('Database connection failed');
        mockGitPort.getOrganizationRepositories.mockRejectedValue(error);

        executePromise = useCase.execute(mockCommand);
      });

      it('re-throws the error', async () => {
        await expect(executePromise).rejects.toThrow(
          'Database connection failed',
        );
      });
    });

    describe('when target retrieval errors occur', () => {
      let executePromise: Promise<TargetWithRepository[]>;

      beforeEach(() => {
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
        mockGitPort.getOrganizationRepositories.mockResolvedValue(
          mockRepositories,
        );
        mockTargetService.getTargetsByGitRepoId.mockRejectedValue(error);

        executePromise = useCase.execute(mockCommand);
      });

      it('re-throws the error', async () => {
        await expect(executePromise).rejects.toThrow('Target retrieval failed');
      });
    });
  });
});
