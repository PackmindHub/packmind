import { stubLogger } from '@packmind/test-utils';
import { createOrganizationId, createUserId, IGitPort } from '@packmind/types';
import {
  createGitRepoId,
  createGitProviderId,
  ISpacesPort,
  ListDetectionProgramCommand,
} from '@packmind/types';
import { ListDetectionProgramUseCase } from './listDetectionProgram.usecase';
import { DetectionProgramService } from '../../services/DetectionProgramService';

describe('ListDetectionProgramUseCase', () => {
  let useCase: ListDetectionProgramUseCase;
  let mockDetectionProgramService: jest.Mocked<DetectionProgramService>;
  let mockGitPort: jest.Mocked<IGitPort>;
  let mockDeploymentsAdapter: {
    findActiveStandardVersionsByRepository: jest.Mock;
    findActiveStandardVersionsByTarget: jest.Mock;
    getTargetsByGitRepo: jest.Mock;
  };
  let mockStandardsAdapter: {
    getStandardVersion: jest.Mock;
    getLatestRulesByStandardId: jest.Mock;
    listStandardsBySpace: jest.Mock;
  };
  let mockSpacesAdapter: jest.Mocked<ISpacesPort>;

  beforeEach(() => {
    mockDetectionProgramService = {
      findActiveByRuleIdWithPrograms: jest.fn(),
    } as unknown as jest.Mocked<DetectionProgramService>;

    mockDeploymentsAdapter = {
      findActiveStandardVersionsByRepository: jest.fn(),
      findActiveStandardVersionsByTarget: jest.fn(),
      getTargetsByGitRepo: jest.fn(),
    };

    mockStandardsAdapter = {
      getStandardVersion: jest.fn(),
      getLatestRulesByStandardId: jest.fn(),
      listStandardsBySpace: jest.fn(),
    };

    mockSpacesAdapter = {
      listSpacesByOrganization: jest.fn(),
      createSpace: jest.fn(),
      getSpaceBySlug: jest.fn(),
      getSpaceById: jest.fn(),
    } as jest.Mocked<ISpacesPort>;

    mockGitPort = {
      findGitRepoByOwnerRepoAndBranchInOrganization: jest.fn(),
      getOrganizationRepositories: jest.fn(),
      findGitRepoByOwnerAndRepo: jest.fn(),
    } as unknown as jest.Mocked<IGitPort>;

    useCase = new ListDetectionProgramUseCase(
      mockDetectionProgramService,
      mockDeploymentsAdapter as never,
      mockStandardsAdapter as never,
      mockSpacesAdapter,
      mockGitPort,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const organizationId = createOrganizationId('org-123');
    const userId = createUserId('user-123');

    describe('when branches array is empty', () => {
      it('throws an error', async () => {
        const command: ListDetectionProgramCommand = {
          organizationId,
          userId,
          gitRemoteUrl: 'github.com/owner/repo',
          branches: [],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          'The current git repository does not have any branch',
        );
      });
    });

    describe('when gitRemoteUrl is empty', () => {
      it('throws an error', async () => {
        const command: ListDetectionProgramCommand = {
          organizationId,
          userId,
          gitRemoteUrl: '',
          branches: ['main'],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          'gitRemoteUrl is required and cannot be empty',
        );
      });
    });

    describe('when matching repo is found with first branch', () => {
      describe('when no targets found', () => {
        const gitRepoId = createGitRepoId('git-repo-1');
        const mockGitRepo = {
          id: gitRepoId,
          owner: 'owner',
          repo: 'repo',
          branch: 'main',
          providerId: createGitProviderId('provider-1'),
        };
        let command: ListDetectionProgramCommand;

        beforeEach(() => {
          mockGitPort.findGitRepoByOwnerRepoAndBranchInOrganization.mockResolvedValue(
            { gitRepo: mockGitRepo },
          );
          mockDeploymentsAdapter.getTargetsByGitRepo.mockResolvedValue([]);

          command = {
            organizationId,
            userId,
            gitRemoteUrl: 'github.com/owner/repo',
            branches: ['main', 'develop'],
          };
        });

        it('throws an error', async () => {
          await expect(useCase.execute(command)).rejects.toThrow(
            'No targets are found on the git repo owner/repo',
          );
        });

        it('calls findGitRepoByOwnerRepoAndBranchInOrganization with correct parameters', async () => {
          try {
            await useCase.execute(command);
          } catch {
            // Expected error
          }

          expect(
            mockGitPort.findGitRepoByOwnerRepoAndBranchInOrganization,
          ).toHaveBeenCalledWith({
            owner: 'owner',
            repo: 'repo',
            branch: 'main',
            organizationId,
            userId,
          });
        });

        it('calls findGitRepoByOwnerRepoAndBranchInOrganization only once', async () => {
          try {
            await useCase.execute(command);
          } catch {
            // Expected error
          }

          expect(
            mockGitPort.findGitRepoByOwnerRepoAndBranchInOrganization,
          ).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe('when matching repo is found with second branch', () => {
      const gitRepoId = createGitRepoId('git-repo-2');
      const mockGitRepo = {
        id: gitRepoId,
        owner: 'owner',
        repo: 'repo',
        branch: 'develop',
        providerId: createGitProviderId('provider-2'),
      };
      let command: ListDetectionProgramCommand;

      beforeEach(() => {
        mockGitPort.findGitRepoByOwnerRepoAndBranchInOrganization
          .mockResolvedValueOnce({ gitRepo: null })
          .mockResolvedValueOnce({ gitRepo: mockGitRepo });
        mockDeploymentsAdapter.getTargetsByGitRepo.mockResolvedValue([]);

        command = {
          organizationId,
          userId,
          gitRemoteUrl: 'github.com/owner/repo',
          branches: ['main', 'develop'],
        };
      });

      describe('when no targets found', () => {
        it('throws an error', async () => {
          await expect(useCase.execute(command)).rejects.toThrow(
            'No targets are found on the git repo owner/repo',
          );
        });

        it('calls findGitRepoByOwnerRepoAndBranchInOrganization twice', async () => {
          try {
            await useCase.execute(command);
          } catch {
            // Expected error
          }

          expect(
            mockGitPort.findGitRepoByOwnerRepoAndBranchInOrganization,
          ).toHaveBeenCalledTimes(2);
        });
      });
    });

    describe('when no branch matches but organization-level repo exists', () => {
      const gitRepoId = createGitRepoId('git-repo-3');
      const mockGitRepo = {
        id: gitRepoId,
        owner: 'owner',
        repo: 'repo',
        branch: 'feature',
        providerId: createGitProviderId('provider-3'),
      };
      let command: ListDetectionProgramCommand;

      beforeEach(() => {
        mockGitPort.findGitRepoByOwnerRepoAndBranchInOrganization.mockResolvedValue(
          { gitRepo: null },
        );
        mockGitPort.getOrganizationRepositories.mockResolvedValue([
          mockGitRepo,
        ]);
        mockDeploymentsAdapter.getTargetsByGitRepo.mockResolvedValue([]);

        command = {
          organizationId,
          userId,
          gitRemoteUrl: 'github.com/owner/repo',
          branches: ['main', 'develop'],
        };
      });

      describe('when no targets found', () => {
        it('throws an error', async () => {
          await expect(useCase.execute(command)).rejects.toThrow(
            'No targets are found on the git repo owner/repo',
          );
        });

        it('calls getOrganizationRepositories with organization ID', async () => {
          try {
            await useCase.execute(command);
          } catch {
            // Expected error
          }

          expect(mockGitPort.getOrganizationRepositories).toHaveBeenCalledWith(
            organizationId,
          );
        });
      });
    });

    describe('when organization has multiple repos with same owner/repo', () => {
      const gitRepoId1 = createGitRepoId('git-repo-4');
      const gitRepoId2 = createGitRepoId('git-repo-5');
      const olderRepo = {
        id: gitRepoId1,
        owner: 'owner',
        repo: 'repo',
        branch: 'branch1',
        providerId: createGitProviderId('provider-4'),
        createdAt: new Date('2020-01-01'),
      };
      const newerRepo = {
        id: gitRepoId2,
        owner: 'owner',
        repo: 'repo',
        branch: 'branch2',
        providerId: createGitProviderId('provider-5'),
        createdAt: new Date('2021-01-01'),
      };
      let command: ListDetectionProgramCommand;

      beforeEach(() => {
        mockGitPort.findGitRepoByOwnerRepoAndBranchInOrganization.mockResolvedValue(
          { gitRepo: null },
        );
        mockGitPort.getOrganizationRepositories.mockResolvedValue([
          newerRepo,
          olderRepo,
        ]);
        mockDeploymentsAdapter.getTargetsByGitRepo.mockResolvedValue([]);

        command = {
          organizationId,
          userId,
          gitRemoteUrl: 'github.com/owner/repo',
          branches: ['main'],
        };
      });

      describe('when no targets found', () => {
        it('throws an error', async () => {
          await expect(useCase.execute(command)).rejects.toThrow(
            'No targets are found on the git repo owner/repo',
          );
        });

        it('calls getTargetsByGitRepo with the older repo ID', async () => {
          try {
            await useCase.execute(command);
          } catch {
            // Expected error
          }

          expect(
            mockDeploymentsAdapter.getTargetsByGitRepo,
          ).toHaveBeenCalledWith({
            organizationId,
            userId,
            gitRepoId: gitRepoId1,
          });
        });
      });
    });

    describe('when no repo found at all', () => {
      it('throws an error', async () => {
        mockGitPort.findGitRepoByOwnerRepoAndBranchInOrganization.mockResolvedValue(
          { gitRepo: null },
        );
        mockGitPort.getOrganizationRepositories.mockResolvedValue([]);

        const command: ListDetectionProgramCommand = {
          organizationId,
          userId,
          gitRemoteUrl: 'github.com/owner/repo',
          branches: ['main'],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          'Git repository (url: github.com/owner/repo) is not connected to your organization',
        );
      });
    });
  });

  describe('parseGitRemoteUrl', () => {
    describe('when given a GitHub URL with simple path', () => {
      it('extracts owner and repo correctly', () => {
        const result = useCase.parseGitRemoteUrl(
          'github.com/PackmindHub/packmind-monorepo',
        );

        expect(result).toEqual({
          owner: 'PackmindHub',
          repo: 'packmind-monorepo',
        });
      });
    });

    describe('when given a GitLab URL with nested groups (2 levels)', () => {
      it('extracts owner with subgroup and repo correctly', () => {
        const result = useCase.parseGitRemoteUrl(
          'gitlab.com/promyze/sandbox/comments-clustering',
        );

        expect(result).toEqual({
          owner: 'promyze/sandbox',
          repo: 'comments-clustering',
        });
      });
    });

    describe('when given a GitLab URL with deeply nested groups (3 levels)', () => {
      it('extracts owner with multiple subgroups and repo correctly', () => {
        const result = useCase.parseGitRemoteUrl(
          'gitlab.com/company/team/project/my-repo',
        );

        expect(result).toEqual({
          owner: 'company/team/project',
          repo: 'my-repo',
        });
      });
    });

    describe('when given a GitLab URL with very deeply nested groups (4 levels)', () => {
      it('extracts owner with all subgroups and repo correctly', () => {
        const result = useCase.parseGitRemoteUrl(
          'gitlab.com/org/division/team/subteam/repository',
        );

        expect(result).toEqual({
          owner: 'org/division/team/subteam',
          repo: 'repository',
        });
      });
    });

    describe('when given a self-hosted GitLab URL with nested groups', () => {
      it('extracts owner with subgroups and repo correctly', () => {
        const result = useCase.parseGitRemoteUrl(
          'gitlab.example.com/group/subgroup/my-project',
        );

        expect(result).toEqual({
          owner: 'group/subgroup',
          repo: 'my-project',
        });
      });
    });

    describe('when given a self-hosted GitLab URL with multiple domain segments and nested groups', () => {
      it('extracts owner with nested projects and repo correctly', () => {
        const result = useCase.parseGitRemoteUrl(
          'acme.corp.gitlab.internal/group/project1/subproject2',
        );

        expect(result).toEqual({
          owner: 'group/project1',
          repo: 'subproject2',
        });
      });
    });

    describe('when given a URL with only domain and repo (no owner)', () => {
      it('throws an error', () => {
        expect(() => {
          useCase.parseGitRemoteUrl('github.com/repo-name');
        }).toThrow('Invalid Git remote URL format: github.com/repo-name');
      });
    });

    describe('when given a URL with only domain', () => {
      it('throws an error', () => {
        expect(() => {
          useCase.parseGitRemoteUrl('github.com');
        }).toThrow('Invalid Git remote URL format: github.com');
      });
    });

    describe('when given an empty string', () => {
      it('throws an error', () => {
        expect(() => {
          useCase.parseGitRemoteUrl('');
        }).toThrow('Invalid Git remote URL format: ');
      });
    });

    describe('when given a URL with special characters in repo name', () => {
      it('extracts owner and repo correctly', () => {
        const result = useCase.parseGitRemoteUrl(
          'github.com/owner/my-repo.name',
        );

        expect(result).toEqual({
          owner: 'owner',
          repo: 'my-repo.name',
        });
      });
    });

    describe('when given a URL with numbers in paths', () => {
      it('extracts owner and repo correctly', () => {
        const result = useCase.parseGitRemoteUrl(
          'gitlab.com/group123/subgroup456/repo789',
        );

        expect(result).toEqual({
          owner: 'group123/subgroup456',
          repo: 'repo789',
        });
      });
    });

    describe('when given a Bitbucket-style URL', () => {
      it('extracts owner and repo correctly', () => {
        const result = useCase.parseGitRemoteUrl(
          'bitbucket.org/workspace/repository',
        );

        expect(result).toEqual({
          owner: 'workspace',
          repo: 'repository',
        });
      });
    });

    describe('when given a GitHub URL with single trailing slash', () => {
      it('extracts owner and repo correctly', () => {
        const result = useCase.parseGitRemoteUrl(
          'github.com/PackmindHub/packmind-monorepo/',
        );

        expect(result).toEqual({
          owner: 'PackmindHub',
          repo: 'packmind-monorepo',
        });
      });
    });

    describe('when given a GitHub URL with multiple trailing slashes', () => {
      it('extracts owner and repo correctly', () => {
        const result = useCase.parseGitRemoteUrl('github.com/owner/repo///');

        expect(result).toEqual({
          owner: 'owner',
          repo: 'repo',
        });
      });
    });

    describe('when given a GitLab nested URL with trailing slash', () => {
      it('extracts owner with subgroups and repo correctly', () => {
        const result = useCase.parseGitRemoteUrl(
          'gitlab.com/group/subgroup/my-project/',
        );

        expect(result).toEqual({
          owner: 'group/subgroup',
          repo: 'my-project',
        });
      });
    });
  });
});
