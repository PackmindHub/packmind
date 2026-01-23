import {
  IStandardsPort,
  IGitPort,
  OrganizationId,
  UserId,
  createGitRepoId,
  createGitProviderId,
  Standard,
  GitRepo,
  GetStandardDeploymentOverviewCommand,
  DistributionStatus,
  createStandardVersionId,
  createStandardId,
  ISpacesPort,
  Space,
  createSpaceId,
  StandardDeploymentOverview,
  Distribution,
  StandardVersion,
  Target,
  createDistributedPackageId,
  createPackageId,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { gitRepoFactory } from '@packmind/git/test';
import { GetStandardDeploymentOverviewUseCase } from './GetStandardDeploymentOverviewUseCase';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { targetFactory } from '../../../test/targetFactory';
import { distributionFactory } from '../../../test/distributionFactory';
import {
  createMockStandard,
  createMockStandardVersion,
} from '../../../test/standardDeploymentOverviewFactory';
import { v4 as uuidv4 } from 'uuid';

function createDistributionWithStandards(params: {
  organizationId: OrganizationId;
  target?: Target;
  status?: DistributionStatus;
  standardVersions?: StandardVersion[];
  createdAt?: string;
}): Distribution {
  const baseDistribution = distributionFactory({
    organizationId: params.organizationId,
    target: params.target,
    status: params.status,
    createdAt: params.createdAt,
  });

  // Override distributedPackages with provided standardVersions
  return {
    ...baseDistribution,
    distributedPackages: [
      {
        id: createDistributedPackageId(uuidv4()),
        distributionId: baseDistribution.id,
        packageId: createPackageId(uuidv4()),
        recipeVersions: [],
        standardVersions: params.standardVersions || [],
      },
    ],
  };
}

describe('GetStandardDeploymentOverviewUseCase', () => {
  let useCase: GetStandardDeploymentOverviewUseCase;
  let mockDistributionRepository: jest.Mocked<IDistributionRepository>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockGitPort: jest.Mocked<IGitPort>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  const logger = stubLogger();

  const organizationId = 'org-123' as OrganizationId;
  const userId = 'user-123' as UserId;

  const mockOverview: StandardDeploymentOverview = {
    repositories: [],
    targets: [],
    standards: [],
  };

  beforeEach(() => {
    mockDistributionRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      listByOrganizationId: jest.fn(),
      listByPackageId: jest.fn(),
      listByRecipeId: jest.fn(),
      listByStandardId: jest.fn(),
      listByTargetIds: jest.fn(),
      listByOrganizationIdWithStatus: jest.fn(),
    } as jest.Mocked<IDistributionRepository>;

    mockStandardsPort = {
      listStandardsBySpace: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    mockGitPort = {
      getOrganizationRepositories: jest.fn(),
    } as unknown as jest.Mocked<IGitPort>;

    mockSpacesPort = {
      listSpacesByOrganization: jest.fn(),
      createSpace: jest.fn(),
      getSpaceBySlug: jest.fn(),
      getSpaceById: jest.fn(),
    } as jest.Mocked<ISpacesPort>;

    useCase = new GetStandardDeploymentOverviewUseCase(
      mockDistributionRepository,
      mockStandardsPort,
      mockGitPort,
      mockSpacesPort,
      logger,
    );
  });

  describe('when getting standard deployment overview', () => {
    const mockDistributions: Distribution[] = [];
    const mockStandards: Standard[] = [];
    const mockGitRepos: GitRepo[] = [];
    const mockSpace: Space = {
      id: createSpaceId('space-1'),
      name: 'Global',
      slug: 'global',
      organizationId,
    };

    let result: StandardDeploymentOverview;

    beforeEach(async () => {
      const command: GetStandardDeploymentOverviewCommand = {
        organizationId,
        userId,
      };

      mockDistributionRepository.listByOrganizationIdWithStatus.mockResolvedValue(
        mockDistributions,
      );
      mockSpacesPort.listSpacesByOrganization.mockResolvedValue([mockSpace]);
      mockStandardsPort.listStandardsBySpace.mockResolvedValue(mockStandards);
      mockGitPort.getOrganizationRepositories.mockResolvedValue(mockGitRepos);

      result = await useCase.execute(command);
    });

    it('returns expected overview', () => {
      expect(result).toEqual(mockOverview);
    });

    it('fetches distributions with success status', () => {
      expect(
        mockDistributionRepository.listByOrganizationIdWithStatus,
      ).toHaveBeenCalledWith(organizationId, DistributionStatus.success);
    });

    it('fetches spaces for organization', () => {
      expect(mockSpacesPort.listSpacesByOrganization).toHaveBeenCalledWith(
        organizationId,
      );
    });

    it('fetches standards by space', () => {
      expect(mockStandardsPort.listStandardsBySpace).toHaveBeenCalledWith(
        mockSpace.id,
        organizationId,
        userId,
      );
    });

    it('fetches organization repositories', () => {
      expect(mockGitPort.getOrganizationRepositories).toHaveBeenCalledWith(
        organizationId,
      );
    });
  });

  describe('when repository throws an error', () => {
    it('logs error and re-throws', async () => {
      const command: GetStandardDeploymentOverviewCommand = {
        organizationId,
        userId,
      };

      const error = new Error('Repository error');
      mockDistributionRepository.listByOrganizationIdWithStatus.mockRejectedValue(
        error,
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        'Repository error',
      );
    });
  });

  describe('when service throws non-Error', () => {
    it('logs string representation and re-throws', async () => {
      const command: GetStandardDeploymentOverviewCommand = {
        organizationId,
        userId,
      };

      const error = 'String error';
      mockDistributionRepository.listByOrganizationIdWithStatus.mockResolvedValue(
        [],
      );
      mockSpacesPort.listSpacesByOrganization.mockRejectedValue(error);

      await expect(useCase.execute(command)).rejects.toBe('String error');
    });
  });

  describe('when overview has data', () => {
    const mockDistributions: Distribution[] = [];
    const mockStandards: Standard[] = [
      { id: 'std-1', name: 'Standard 1', version: 1 } as Standard,
    ];
    const mockGitRepos: GitRepo[] = [
      {
        id: createGitRepoId('repo-1'),
        name: 'Repository 1',
        owner: 'owner1',
        repo: 'repo1',
        branch: 'main',
        providerId: createGitProviderId('provider1'),
      } as GitRepo,
      {
        id: createGitRepoId('repo-2'),
        name: 'Repository 2',
        owner: 'owner2',
        repo: 'repo2',
        branch: 'main',
        providerId: createGitProviderId('provider2'),
      } as GitRepo,
    ];

    const mockSpace: Space = {
      id: createSpaceId('space-1'),
      name: 'Global',
      slug: 'global',
      organizationId,
    };

    let result: StandardDeploymentOverview;

    beforeEach(async () => {
      const command: GetStandardDeploymentOverviewCommand = {
        organizationId,
        userId,
      };

      mockDistributionRepository.listByOrganizationIdWithStatus.mockResolvedValue(
        mockDistributions,
      );
      mockSpacesPort.listSpacesByOrganization.mockResolvedValue([mockSpace]);
      mockStandardsPort.listStandardsBySpace.mockResolvedValue(mockStandards);
      mockGitPort.getOrganizationRepositories.mockResolvedValue(mockGitRepos);

      result = await useCase.execute(command);
    });

    it('returns two repositories', () => {
      expect(result.repositories).toHaveLength(2);
    });

    it('returns one standard', () => {
      expect(result.standards).toHaveLength(1);
    });

    it('returns first repository with correct id', () => {
      expect(result.repositories[0].gitRepo.id).toBe(createGitRepoId('repo-1'));
    });

    it('returns second repository with correct id', () => {
      expect(result.repositories[1].gitRepo.id).toBe(createGitRepoId('repo-2'));
    });

    it('returns standard with correct id', () => {
      expect(result.standards[0].standard.id).toBe('std-1');
    });
  });

  describe('when deployments with targets exist', () => {
    const mockGitRepo = gitRepoFactory();
    const mockTarget = targetFactory({ gitRepoId: mockGitRepo.id });
    const mockStandard = createMockStandard({
      id: createStandardId('std-1'),
      name: 'Test Standard',
      version: 2,
    });
    const mockSpace: Space = {
      id: createSpaceId('space-1'),
      name: 'Global',
      slug: 'global',
      organizationId,
    };

    let result: StandardDeploymentOverview;

    beforeEach(async () => {
      const command: GetStandardDeploymentOverviewCommand = {
        organizationId,
        userId,
      };

      const mockStandardVersion = createMockStandardVersion({
        id: createStandardVersionId('standard-version-1'),
        standardId: mockStandard.id,
        version: 1,
      });

      const mockDistribution = createDistributionWithStandards({
        organizationId,
        target: mockTarget,
        status: DistributionStatus.success,
        standardVersions: [mockStandardVersion],
      });

      mockDistributionRepository.listByOrganizationIdWithStatus.mockResolvedValue(
        [mockDistribution],
      );
      mockSpacesPort.listSpacesByOrganization.mockResolvedValue([mockSpace]);
      mockStandardsPort.listStandardsBySpace.mockResolvedValue([mockStandard]);
      mockGitPort.getOrganizationRepositories.mockResolvedValue([mockGitRepo]);

      result = await useCase.execute(command);
    });

    describe('target-centric deployment information', () => {
      it('returns one target', () => {
        expect(result.targets).toHaveLength(1);
      });

      it('returns target with correct id', () => {
        expect(result.targets[0].target.id).toBe(mockTarget.id);
      });

      it('returns target with correct git repo id', () => {
        expect(result.targets[0].gitRepo.id).toBe(mockGitRepo.id);
      });

      it('returns target with one deployed standard', () => {
        expect(result.targets[0].deployedStandards).toHaveLength(1);
      });

      it('marks target as having outdated standards', () => {
        expect(result.targets[0].hasOutdatedStandards).toBe(true);
      });
    });

    describe('repository-centric deployment information for backward compatibility', () => {
      it('returns one repository', () => {
        expect(result.repositories).toHaveLength(1);
      });

      it('returns repository with correct git repo id', () => {
        expect(result.repositories[0].gitRepo.id).toBe(mockGitRepo.id);
      });

      it('returns repository with one deployed standard', () => {
        expect(result.repositories[0].deployedStandards).toHaveLength(1);
      });

      it('marks repository as having outdated standards', () => {
        expect(result.repositories[0].hasOutdatedStandards).toBe(true);
      });
    });

    describe('standard-centric deployment information', () => {
      it('returns one standard', () => {
        expect(result.standards).toHaveLength(1);
      });

      it('returns standard with correct id', () => {
        expect(result.standards[0].standard.id).toBe(mockStandard.id);
      });

      it('returns standard with one target deployment', () => {
        expect(result.standards[0].targetDeployments).toHaveLength(1);
      });

      it('returns target deployment with correct target id', () => {
        expect(result.standards[0].targetDeployments[0].target.id).toBe(
          mockTarget.id,
        );
      });

      it('marks target deployment as not up to date', () => {
        expect(result.standards[0].targetDeployments[0].isUpToDate).toBe(false);
      });

      it('marks standard as having outdated deployments', () => {
        expect(result.standards[0].hasOutdatedDeployments).toBe(true);
      });
    });
  });

  describe('when multiple targets exist for same repository', () => {
    const mockGitRepo = gitRepoFactory();
    const mockTarget1 = targetFactory({
      gitRepoId: mockGitRepo.id,
      name: 'backend',
      path: '/backend',
    });
    const mockTarget2 = targetFactory({
      gitRepoId: mockGitRepo.id,
      name: 'frontend',
      path: '/frontend',
    });
    const mockStandard = createMockStandard({
      id: createStandardId('std-1'),
      name: 'Test Standard',
      version: 1,
    });

    let result: StandardDeploymentOverview;

    beforeEach(async () => {
      const command: GetStandardDeploymentOverviewCommand = {
        organizationId,
        userId,
      };

      const mockStandardVersion = createMockStandardVersion({
        standardId: mockStandard.id,
        version: 1,
      });

      const mockDistribution1 = createDistributionWithStandards({
        organizationId,
        target: mockTarget1,
        status: DistributionStatus.success,
        standardVersions: [mockStandardVersion],
      });

      const mockDistribution2 = createDistributionWithStandards({
        organizationId,
        target: mockTarget2,
        status: DistributionStatus.success,
        standardVersions: [mockStandardVersion],
      });

      const mockSpace: Space = {
        id: createSpaceId('space-1'),
        name: 'Global',
        slug: 'global',
        organizationId,
      };

      mockDistributionRepository.listByOrganizationIdWithStatus.mockResolvedValue(
        [mockDistribution1, mockDistribution2],
      );
      mockSpacesPort.listSpacesByOrganization.mockResolvedValue([mockSpace]);
      mockStandardsPort.listStandardsBySpace.mockResolvedValue([mockStandard]);
      mockGitPort.getOrganizationRepositories.mockResolvedValue([mockGitRepo]);

      result = await useCase.execute(command);
    });

    describe('target statuses', () => {
      it('returns two targets', () => {
        expect(result.targets).toHaveLength(2);
      });

      it('includes backend target', () => {
        expect(result.targets.map((t) => t.target.name)).toContain('backend');
      });

      it('includes frontend target', () => {
        expect(result.targets.map((t) => t.target.name)).toContain('frontend');
      });
    });

    describe('standard deployment', () => {
      it('returns one standard', () => {
        expect(result.standards).toHaveLength(1);
      });

      it('includes two target deployments', () => {
        expect(result.standards[0].targetDeployments).toHaveLength(2);
      });

      it('includes backend target deployment', () => {
        expect(
          result.standards[0].targetDeployments.map((td) => td.target.name),
        ).toContain('backend');
      });

      it('includes frontend target deployment', () => {
        expect(
          result.standards[0].targetDeployments.map((td) => td.target.name),
        ).toContain('frontend');
      });
    });
  });

  describe('when standards exist without deployments', () => {
    const mockGitRepo = gitRepoFactory();
    const mockStandard = createMockStandard({
      id: createStandardId('std-1'),
      name: 'Undeployed Standard',
      version: 1,
    });

    let result: StandardDeploymentOverview;

    beforeEach(async () => {
      const command: GetStandardDeploymentOverviewCommand = {
        organizationId,
        userId,
      };

      const mockSpace: Space = {
        id: createSpaceId('space-1'),
        name: 'Global',
        slug: 'global',
        organizationId,
      };

      mockDistributionRepository.listByOrganizationIdWithStatus.mockResolvedValue(
        [],
      );
      mockSpacesPort.listSpacesByOrganization.mockResolvedValue([mockSpace]);
      mockStandardsPort.listStandardsBySpace.mockResolvedValue([mockStandard]);
      mockGitPort.getOrganizationRepositories.mockResolvedValue([mockGitRepo]);

      result = await useCase.execute(command);
    });

    describe('standard-centric view', () => {
      it('returns one standard', () => {
        expect(result.standards).toHaveLength(1);
      });

      it('returns standard with correct id', () => {
        expect(result.standards[0].standard.id).toBe(mockStandard.id);
      });

      it('returns standard with no deployments', () => {
        expect(result.standards[0].deployments).toHaveLength(0);
      });

      it('returns standard with no target deployments', () => {
        expect(result.standards[0].targetDeployments).toHaveLength(0);
      });

      it('marks standard as not having outdated deployments', () => {
        expect(result.standards[0].hasOutdatedDeployments).toBe(false);
      });

      it('returns standard with latest version 1', () => {
        expect(result.standards[0].latestVersion.version).toBe(1);
      });
    });

    describe('repository view', () => {
      it('returns one repository', () => {
        expect(result.repositories).toHaveLength(1);
      });

      it('returns repository with no deployed standards', () => {
        expect(result.repositories[0].deployedStandards).toHaveLength(0);
      });

      it('marks repository as not having outdated standards', () => {
        expect(result.repositories[0].hasOutdatedStandards).toBe(false);
      });
    });

    describe('target view', () => {
      it('returns empty targets array', () => {
        expect(result.targets).toHaveLength(0);
      });
    });
  });

  describe('public helper methods', () => {
    const mockGitRepo = gitRepoFactory();
    const mockTarget = targetFactory({ gitRepoId: mockGitRepo.id });
    const mockStandard = createMockStandard();

    describe('buildTargetCentricView', () => {
      describe('when grouping deployments by target', () => {
        const mockStandardVersion = createMockStandardVersion({
          standardId: mockStandard.id,
          version: 1,
        });

        let targetStatuses: ReturnType<typeof useCase.buildTargetCentricView>;

        beforeEach(() => {
          const mockDistribution = createDistributionWithStandards({
            organizationId,
            target: mockTarget,
            status: DistributionStatus.success,
            standardVersions: [mockStandardVersion],
          });

          targetStatuses = useCase.buildTargetCentricView(
            [mockDistribution],
            [mockStandard],
            [mockGitRepo],
          );
        });

        it('returns one target status', () => {
          expect(targetStatuses).toHaveLength(1);
        });

        it('returns target status with correct target id', () => {
          expect(targetStatuses[0].target.id).toBe(mockTarget.id);
        });

        it('returns target status with one deployed standard', () => {
          expect(targetStatuses[0].deployedStandards).toHaveLength(1);
        });
      });

      it('handles deployments without targets gracefully', () => {
        const mockDistribution = createDistributionWithStandards({
          organizationId,
          target: undefined,
          status: DistributionStatus.success,
          standardVersions: [],
        });

        const targetStatuses = useCase.buildTargetCentricView(
          [mockDistribution],
          [mockStandard],
          [mockGitRepo],
        );

        expect(targetStatuses).toHaveLength(0);
      });
    });

    describe('buildTargetDeploymentsForStandard', () => {
      describe('when building target deployments for a specific standard', () => {
        const mockStandardVersion = createMockStandardVersion({
          standardId: mockStandard.id,
          version: 1,
        });

        let targetDeployments: ReturnType<
          typeof useCase.buildTargetDeploymentsForStandard
        >;

        beforeEach(() => {
          const mockDistribution = createDistributionWithStandards({
            organizationId,
            target: mockTarget,
            status: DistributionStatus.success,
            standardVersions: [mockStandardVersion],
          });

          targetDeployments = useCase.buildTargetDeploymentsForStandard(
            mockStandard,
            [mockDistribution],
            [mockGitRepo],
          );
        });

        it('returns one target deployment', () => {
          expect(targetDeployments).toHaveLength(1);
        });

        it('returns target deployment with correct target id', () => {
          expect(targetDeployments[0].target.id).toBe(mockTarget.id);
        });

        it('returns target deployment with correct standard id', () => {
          expect(targetDeployments[0].deployedVersion.standardId).toBe(
            mockStandard.id,
          );
        });
      });

      it('filters out deployments for other standards', () => {
        const otherStandard = createMockStandard({
          id: createStandardId('other-standard'),
        });
        const otherStandardVersion = createMockStandardVersion({
          standardId: otherStandard.id,
          version: 1,
        });

        const mockDistribution = createDistributionWithStandards({
          organizationId,
          target: mockTarget,
          status: DistributionStatus.success,
          standardVersions: [otherStandardVersion],
        });

        const targetDeployments = useCase.buildTargetDeploymentsForStandard(
          mockStandard,
          [mockDistribution],
          [mockGitRepo],
        );

        expect(targetDeployments).toHaveLength(0);
      });

      describe('when multiple deployments exist for same target', () => {
        let targetDeployments: ReturnType<
          typeof useCase.buildTargetDeploymentsForStandard
        >;

        beforeEach(() => {
          const olderVersion = createMockStandardVersion({
            standardId: mockStandard.id,
            version: 1,
          });

          const newerVersion = createMockStandardVersion({
            standardId: mockStandard.id,
            version: 2,
          });

          const olderDistribution = createDistributionWithStandards({
            organizationId,
            target: mockTarget,
            status: DistributionStatus.success,
            standardVersions: [olderVersion],
            createdAt: '2023-01-01T00:00:00Z',
          });

          const newerDistribution = createDistributionWithStandards({
            organizationId,
            target: mockTarget,
            status: DistributionStatus.success,
            standardVersions: [newerVersion],
            createdAt: '2023-01-02T00:00:00Z',
          });

          targetDeployments = useCase.buildTargetDeploymentsForStandard(
            mockStandard,
            [olderDistribution, newerDistribution],
            [mockGitRepo],
          );
        });

        it('returns one target deployment', () => {
          expect(targetDeployments).toHaveLength(1);
        });

        it('returns target deployment with latest version', () => {
          expect(targetDeployments[0].deployedVersion.version).toBe(2);
        });

        it('returns target deployment with latest deployment date', () => {
          expect(targetDeployments[0].deploymentDate).toBe(
            '2023-01-02T00:00:00Z',
          );
        });
      });
    });
  });

  describe('when a deployed standard has been deleted', () => {
    const mockGitRepo = gitRepoFactory();
    const mockTarget = targetFactory({ gitRepoId: mockGitRepo.id });
    const mockActiveStandard = createMockStandard({
      id: createStandardId('active-std'),
      name: 'Active Standard',
      version: 1,
    });
    const mockDeletedStandard = createMockStandard({
      id: createStandardId('deleted-std'),
      name: 'Deleted Standard',
      version: 1,
    });

    const mockSpace: Space = {
      id: createSpaceId('space-1'),
      name: 'Global',
      slug: 'global',
      organizationId,
    };

    let result: StandardDeploymentOverview;

    beforeEach(async () => {
      const command: GetStandardDeploymentOverviewCommand = {
        organizationId,
        userId,
      };

      const activeStandardVersion = createMockStandardVersion({
        standardId: mockActiveStandard.id,
        version: 1,
      });

      const deletedStandardVersion = createMockStandardVersion({
        standardId: mockDeletedStandard.id,
        version: 1,
      });

      const mockDistribution = createDistributionWithStandards({
        organizationId,
        target: mockTarget,
        status: DistributionStatus.success,
        standardVersions: [activeStandardVersion, deletedStandardVersion],
      });

      mockDistributionRepository.listByOrganizationIdWithStatus.mockResolvedValue(
        [mockDistribution],
      );
      mockSpacesPort.listSpacesByOrganization.mockResolvedValue([mockSpace]);

      // First call returns only active standards
      // Second call (with includeDeleted) returns all standards
      mockStandardsPort.listStandardsBySpace
        .mockResolvedValueOnce([mockActiveStandard])
        .mockResolvedValueOnce([mockActiveStandard, mockDeletedStandard]);

      mockGitPort.getOrganizationRepositories.mockResolvedValue([mockGitRepo]);

      result = await useCase.execute(command);
    });

    it('returns two standards', () => {
      expect(result.standards).toHaveLength(2);
    });

    it('marks active standard as not deleted', () => {
      const activeStandardStatus = result.standards.find(
        (s) => s.standard.id === mockActiveStandard.id,
      );
      expect(activeStandardStatus?.isDeleted).toBeUndefined();
    });

    it('marks deleted standard with isDeleted true', () => {
      const deletedStandardStatus = result.standards.find(
        (s) => s.standard.id === mockDeletedStandard.id,
      );
      expect(deletedStandardStatus?.isDeleted).toBe(true);
    });

    it('calls listStandardsBySpace twice to fetch deleted standards', () => {
      expect(mockStandardsPort.listStandardsBySpace).toHaveBeenCalledTimes(2);
    });

    it('calls listStandardsBySpace with includeDeleted option', () => {
      expect(mockStandardsPort.listStandardsBySpace).toHaveBeenNthCalledWith(
        2,
        mockSpace.id,
        organizationId,
        userId,
        { includeDeleted: true },
      );
    });
  });
});
