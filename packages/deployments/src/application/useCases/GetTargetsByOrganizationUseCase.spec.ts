import { GetTargetsByOrganizationUseCase } from './GetTargetsByOrganizationUseCase';
import { TargetService } from '../services/TargetService';
import {
  Target,
  TargetWithRepository,
  GetTargetsByOrganizationCommand,
  createTargetId,
  createGitRepoId,
  createGitProviderId,
  IGitPort,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { createOrganizationId, createUserId } from '@packmind/types';

describe('GetTargetsByOrganizationUseCase', () => {
  let useCase: GetTargetsByOrganizationUseCase;
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

    useCase = new GetTargetsByOrganizationUseCase(
      mockTargetService,
      mockGitPort,
      stubLogger(),
    );
  });

  describe('execute', () => {
    const mockCommand: GetTargetsByOrganizationCommand = {
      organizationId: createOrganizationId('org-123'),
      userId: createUserId('user-123'),
    };

    describe('when organization has multiple repositories with targets', () => {
      let result: TargetWithRepository[];
      let mockRepositories: {
        id: ReturnType<typeof createGitRepoId>;
        owner: string;
        repo: string;
        branch: string;
        providerId: ReturnType<typeof createGitProviderId>;
      }[];
      let mockTargetsRepo1: Target[];
      let mockTargetsRepo2: Target[];

      beforeEach(async () => {
        mockRepositories = [
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

        mockTargetsRepo1 = [
          {
            id: createTargetId('target-1'),
            name: 'Production',
            path: '/prod',
            gitRepoId: createGitRepoId('repo-1'),
          },
        ];

        mockTargetsRepo2 = [
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

        mockGitPort.getOrganizationRepositories.mockResolvedValue(
          mockRepositories,
        );
        mockTargetService.getTargetsByGitRepoId
          .mockResolvedValueOnce(mockTargetsRepo1)
          .mockResolvedValueOnce(mockTargetsRepo2);

        result = await useCase.execute(mockCommand);
      });

      it('returns all targets for all repositories', () => {
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
      });

      it('calls git port with organization id', () => {
        expect(mockGitPort.getOrganizationRepositories).toHaveBeenCalledWith(
          mockCommand.organizationId,
        );
      });

      it('fetches targets for each repository', () => {
        expect(mockTargetService.getTargetsByGitRepoId).toHaveBeenCalledTimes(
          2,
        );
      });

      it('fetches targets for first repository', () => {
        expect(mockTargetService.getTargetsByGitRepoId).toHaveBeenCalledWith(
          mockRepositories[0].id,
        );
      });

      it('fetches targets for second repository', () => {
        expect(mockTargetService.getTargetsByGitRepoId).toHaveBeenCalledWith(
          mockRepositories[1].id,
        );
      });
    });

    describe('when no repositories exist for organization', () => {
      let result: TargetWithRepository[];

      beforeEach(async () => {
        mockGitPort.getOrganizationRepositories.mockResolvedValue([]);

        result = await useCase.execute(mockCommand);
      });

      it('returns empty array', () => {
        expect(result).toEqual([]);
      });

      it('calls git port with organization id', () => {
        expect(mockGitPort.getOrganizationRepositories).toHaveBeenCalledWith(
          mockCommand.organizationId,
        );
      });

      it('does not call target service', () => {
        expect(mockTargetService.getTargetsByGitRepoId).not.toHaveBeenCalled();
      });
    });

    describe('when repositories have no targets', () => {
      let result: TargetWithRepository[];
      let mockRepositories: {
        id: ReturnType<typeof createGitRepoId>;
        owner: string;
        repo: string;
        branch: string;
        providerId: ReturnType<typeof createGitProviderId>;
      }[];

      beforeEach(async () => {
        mockRepositories = [
          {
            id: createGitRepoId('repo-1'),
            owner: 'owner1',
            repo: 'repo1',
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

      it('fetches targets for the repository', () => {
        expect(mockTargetService.getTargetsByGitRepoId).toHaveBeenCalledWith(
          mockRepositories[0].id,
        );
      });
    });

    describe('when git port errors occur', () => {
      let error: Error;

      beforeEach(() => {
        error = new Error('Git service unavailable');
        mockGitPort.getOrganizationRepositories.mockRejectedValue(error);
      });

      it('re-throws the error', async () => {
        await expect(useCase.execute(mockCommand)).rejects.toThrow(
          'Git service unavailable',
        );
      });

      it('calls git port with organization id', async () => {
        try {
          await useCase.execute(mockCommand);
        } catch {
          // Expected to throw
        }

        expect(mockGitPort.getOrganizationRepositories).toHaveBeenCalledWith(
          mockCommand.organizationId,
        );
      });
    });

    describe('when target service errors occur', () => {
      let mockRepositories: {
        id: ReturnType<typeof createGitRepoId>;
        owner: string;
        repo: string;
        branch: string;
        providerId: ReturnType<typeof createGitProviderId>;
      }[];

      beforeEach(() => {
        mockRepositories = [
          {
            id: createGitRepoId('repo-1'),
            owner: 'owner1',
            repo: 'repo1',
            branch: 'main',
            providerId: createGitProviderId('provider-1'),
          },
        ];

        const error = new Error('Database connection failed');
        mockGitPort.getOrganizationRepositories.mockResolvedValue(
          mockRepositories,
        );
        mockTargetService.getTargetsByGitRepoId.mockRejectedValue(error);
      });

      it('re-throws the error', async () => {
        await expect(useCase.execute(mockCommand)).rejects.toThrow(
          'Database connection failed',
        );
      });

      it('calls target service with repository id', async () => {
        try {
          await useCase.execute(mockCommand);
        } catch {
          // Expected to throw
        }

        expect(mockTargetService.getTargetsByGitRepoId).toHaveBeenCalledWith(
          mockRepositories[0].id,
        );
      });
    });
  });
});
