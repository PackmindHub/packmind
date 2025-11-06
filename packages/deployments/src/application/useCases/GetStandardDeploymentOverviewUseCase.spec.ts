import { StandardsHexa } from '@packmind/standards';
import { GitHexa } from '@packmind/git';
import { OrganizationId, UserId } from '@packmind/types';
import {
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
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { gitRepoFactory } from '@packmind/git/test';
import { GetStandardDeploymentOverviewUseCase } from './GetStandardDeploymentOverviewUseCase';
import { StandardsDeployment } from '../../domain/entities/StandardsDeployment';
import { IStandardsDeploymentRepository } from '../../domain/repositories/IStandardsDeploymentRepository';
import { StandardDeploymentOverview } from '../../domain/types/StandardDeploymentOverview';
import { standardsDeploymentFactory } from '../../../test/standardsDeploymentFactory';
import { targetFactory } from '../../../test/targetFactory';
import {
  createMockStandard,
  createMockStandardVersion,
} from '../../../test/standardDeploymentOverviewFactory';

describe('GetStandardDeploymentOverviewUseCase', () => {
  let useCase: GetStandardDeploymentOverviewUseCase;
  let mockStandardsDeploymentRepository: jest.Mocked<IStandardsDeploymentRepository>;
  let mockStandardsHexa: jest.Mocked<StandardsHexa>;
  let mockGitHexa: jest.Mocked<GitHexa>;
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
    mockStandardsDeploymentRepository = {
      listByOrganizationId: jest.fn(),
      listByStandardId: jest.fn(),
      listByOrganizationIdAndGitRepos: jest.fn(),
      findActiveStandardVersionsByRepository: jest.fn(),
      findActiveStandardVersionsByTarget: jest.fn(),
      listByTargetIds: jest.fn(),
      listByOrganizationIdWithStatus: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      list: jest.fn(),
    } as unknown as jest.Mocked<IStandardsDeploymentRepository>;

    mockStandardsHexa = {
      listStandardsBySpace: jest.fn(),
    } as unknown as jest.Mocked<StandardsHexa>;

    mockGitHexa = {
      getOrganizationRepositories: jest.fn(),
    } as unknown as jest.Mocked<GitHexa>;

    mockSpacesPort = {
      listSpacesByOrganization: jest.fn(),
      createSpace: jest.fn(),
      getSpaceBySlug: jest.fn(),
      getSpaceById: jest.fn(),
    } as jest.Mocked<ISpacesPort>;

    useCase = new GetStandardDeploymentOverviewUseCase(
      mockStandardsDeploymentRepository,
      mockStandardsHexa,
      mockGitHexa,
      mockSpacesPort,
      logger,
    );
  });

  describe('when getting standard deployment overview', () => {
    it('returns overview built from deployment data', async () => {
      const command: GetStandardDeploymentOverviewCommand = {
        organizationId,
        userId,
      };

      const mockDeployments: StandardsDeployment[] = [];
      const mockStandards: Standard[] = [];
      const mockGitRepos: GitRepo[] = [];
      const mockSpace: Space = {
        id: createSpaceId('space-1'),
        name: 'Global',
        slug: 'global',
        organizationId,
      };

      mockStandardsDeploymentRepository.listByOrganizationIdWithStatus.mockResolvedValue(
        mockDeployments,
      );
      mockSpacesPort.listSpacesByOrganization.mockResolvedValue([mockSpace]);
      mockStandardsHexa.listStandardsBySpace.mockResolvedValue({
        standards: mockStandards,
      });
      mockGitHexa.getOrganizationRepositories.mockResolvedValue(mockGitRepos);

      const result = await useCase.execute(command);

      expect(result).toEqual(mockOverview);
      expect(
        mockStandardsDeploymentRepository.listByOrganizationIdWithStatus,
      ).toHaveBeenCalledWith(organizationId, DistributionStatus.success);
      expect(mockSpacesPort.listSpacesByOrganization).toHaveBeenCalledWith(
        organizationId,
      );
      expect(mockStandardsHexa.listStandardsBySpace).toHaveBeenCalledWith({
        userId,
        organizationId,
        spaceId: mockSpace.id,
      });
      expect(mockGitHexa.getOrganizationRepositories).toHaveBeenCalledWith(
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
      mockStandardsDeploymentRepository.listByOrganizationIdWithStatus.mockRejectedValue(
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
      mockSpacesPort.listSpacesByOrganization.mockRejectedValue(error);

      await expect(useCase.execute(command)).rejects.toBe('String error');
    });
  });

  describe('when overview has data', () => {
    it('builds overview with deployment data', async () => {
      const command: GetStandardDeploymentOverviewCommand = {
        organizationId,
        userId,
      };

      const mockDeployments: StandardsDeployment[] = [];
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

      mockStandardsDeploymentRepository.listByOrganizationIdWithStatus.mockResolvedValue(
        mockDeployments,
      );
      mockSpacesPort.listSpacesByOrganization.mockResolvedValue([mockSpace]);
      mockStandardsHexa.listStandardsBySpace.mockResolvedValue({
        standards: mockStandards,
      });
      mockGitHexa.getOrganizationRepositories.mockResolvedValue(mockGitRepos);

      const result = await useCase.execute(command);

      expect(result.repositories).toHaveLength(2);
      expect(result.standards).toHaveLength(1);
      expect(result.repositories[0].gitRepo.id).toBe(createGitRepoId('repo-1'));
      expect(result.repositories[1].gitRepo.id).toBe(createGitRepoId('repo-2'));
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

      const mockDeployment = standardsDeploymentFactory({
        organizationId,
        target: mockTarget,
        status: DistributionStatus.success,
        standardVersions: [mockStandardVersion],
      });

      mockStandardsDeploymentRepository.listByOrganizationIdWithStatus.mockResolvedValue(
        [mockDeployment],
      );
      mockSpacesPort.listSpacesByOrganization.mockResolvedValue([mockSpace]);
      mockStandardsHexa.listStandardsBySpace.mockResolvedValue({
        standards: [mockStandard],
      });
      mockGitHexa.getOrganizationRepositories.mockResolvedValue([mockGitRepo]);

      result = await useCase.execute(command);
    });

    it('includes target-centric deployment information', () => {
      expect(result.targets).toHaveLength(1);
      const targetStatus = result.targets[0];
      expect(targetStatus.target.id).toBe(mockTarget.id);
      expect(targetStatus.gitRepo.id).toBe(mockGitRepo.id);
      expect(targetStatus.deployedStandards).toHaveLength(1);
      expect(targetStatus.hasOutdatedStandards).toBe(true); // version 1 deployed, latest is 2
    });

    it('includes repository-centric deployment information for backward compatibility', () => {
      expect(result.repositories).toHaveLength(1);
      const repoStatus = result.repositories[0];
      expect(repoStatus.gitRepo.id).toBe(mockGitRepo.id);
      expect(repoStatus.deployedStandards).toHaveLength(1);
      expect(repoStatus.hasOutdatedStandards).toBe(true);
    });

    it('includes standard-centric deployment information', () => {
      expect(result.standards).toHaveLength(1);
      const standardStatus = result.standards[0];
      expect(standardStatus.standard.id).toBe(mockStandard.id);
      expect(standardStatus.targetDeployments).toHaveLength(1);
      expect(standardStatus.targetDeployments[0].target.id).toBe(mockTarget.id);
      expect(standardStatus.targetDeployments[0].isUpToDate).toBe(false);
      expect(standardStatus.hasOutdatedDeployments).toBe(true);
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

      const mockDeployment1 = standardsDeploymentFactory({
        organizationId,
        target: mockTarget1,
        status: DistributionStatus.success,
        standardVersions: [mockStandardVersion],
      });

      const mockDeployment2 = standardsDeploymentFactory({
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

      mockStandardsDeploymentRepository.listByOrganizationIdWithStatus.mockResolvedValue(
        [mockDeployment1, mockDeployment2],
      );
      mockSpacesPort.listSpacesByOrganization.mockResolvedValue([mockSpace]);
      mockStandardsHexa.listStandardsBySpace.mockResolvedValue({
        standards: [mockStandard],
      });
      mockGitHexa.getOrganizationRepositories.mockResolvedValue([mockGitRepo]);

      result = await useCase.execute(command);
    });

    it('creates separate target statuses for each target', () => {
      expect(result.targets).toHaveLength(2);
      expect(result.targets.map((t) => t.target.name)).toContain('backend');
      expect(result.targets.map((t) => t.target.name)).toContain('frontend');
    });

    it('standard deployment includes both targets', () => {
      expect(result.standards).toHaveLength(1);
      const standardStatus = result.standards[0];
      expect(standardStatus.targetDeployments).toHaveLength(2);
      expect(
        standardStatus.targetDeployments.map((td) => td.target.name),
      ).toContain('backend');
      expect(
        standardStatus.targetDeployments.map((td) => td.target.name),
      ).toContain('frontend');
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

      mockStandardsDeploymentRepository.listByOrganizationIdWithStatus.mockResolvedValue(
        [],
      );
      mockSpacesPort.listSpacesByOrganization.mockResolvedValue([mockSpace]);
      mockStandardsHexa.listStandardsBySpace.mockResolvedValue({
        standards: [mockStandard],
      });
      mockGitHexa.getOrganizationRepositories.mockResolvedValue([mockGitRepo]);

      result = await useCase.execute(command);
    });

    it('includes standards with no deployments in standard-centric view', () => {
      expect(result.standards).toHaveLength(1);
      const undeployedStandard = result.standards[0];
      expect(undeployedStandard.standard.id).toBe(mockStandard.id);
      expect(undeployedStandard.deployments).toHaveLength(0);
      expect(undeployedStandard.targetDeployments).toHaveLength(0);
      expect(undeployedStandard.hasOutdatedDeployments).toBe(false);
      expect(undeployedStandard.latestVersion.version).toBe(1);
    });

    it('includes repository with no deployed standards', () => {
      expect(result.repositories).toHaveLength(1);
      expect(result.repositories[0].deployedStandards).toHaveLength(0);
      expect(result.repositories[0].hasOutdatedStandards).toBe(false);
    });

    describe('when no deployments exist', () => {
      it('includes empty targets array', () => {
        expect(result.targets).toHaveLength(0);
      });
    });
  });

  describe('public helper methods', () => {
    const mockGitRepo = gitRepoFactory();
    const mockTarget = targetFactory({ gitRepoId: mockGitRepo.id });
    const mockStandard = createMockStandard();

    describe('buildTargetCentricView', () => {
      it('groups deployments by target correctly', () => {
        const mockStandardVersion = createMockStandardVersion({
          standardId: mockStandard.id,
          version: 1,
        });

        const mockDeployment = standardsDeploymentFactory({
          organizationId,
          target: mockTarget,
          status: DistributionStatus.success,
          standardVersions: [mockStandardVersion],
        });

        const targetStatuses = useCase.buildTargetCentricView(
          [mockDeployment],
          [mockStandard],
          [mockGitRepo],
        );

        expect(targetStatuses).toHaveLength(1);
        expect(targetStatuses[0].target.id).toBe(mockTarget.id);
        expect(targetStatuses[0].deployedStandards).toHaveLength(1);
      });

      it('handles deployments without targets gracefully', () => {
        const mockDeployment = standardsDeploymentFactory({
          organizationId,
          target: undefined,
          status: DistributionStatus.success,
          standardVersions: [],
        });

        const targetStatuses = useCase.buildTargetCentricView(
          [mockDeployment],
          [mockStandard],
          [mockGitRepo],
        );

        expect(targetStatuses).toHaveLength(0);
      });
    });

    describe('buildTargetDeploymentsForStandard', () => {
      it('builds target deployments for a specific standard', () => {
        const mockStandardVersion = createMockStandardVersion({
          standardId: mockStandard.id,
          version: 1,
        });

        const mockDeployment = standardsDeploymentFactory({
          organizationId,
          target: mockTarget,
          status: DistributionStatus.success,
          standardVersions: [mockStandardVersion],
        });

        const targetDeployments = useCase.buildTargetDeploymentsForStandard(
          mockStandard,
          [mockDeployment],
          [mockGitRepo],
        );

        expect(targetDeployments).toHaveLength(1);
        expect(targetDeployments[0].target.id).toBe(mockTarget.id);
        expect(targetDeployments[0].deployedVersion.standardId).toBe(
          mockStandard.id,
        );
      });

      it('filters out deployments for other standards', () => {
        const otherStandard = createMockStandard({
          id: createStandardId('other-standard'),
        });
        const otherStandardVersion = createMockStandardVersion({
          standardId: otherStandard.id,
          version: 1,
        });

        const mockDeployment = standardsDeploymentFactory({
          organizationId,
          target: mockTarget,
          status: DistributionStatus.success,
          standardVersions: [otherStandardVersion], // Different standard
        });

        const targetDeployments = useCase.buildTargetDeploymentsForStandard(
          mockStandard, // Looking for this standard
          [mockDeployment],
          [mockGitRepo],
        );

        expect(targetDeployments).toHaveLength(0);
      });

      describe('when multiple deployments exist for same target', () => {
        it('returns latest version', () => {
          const olderVersion = createMockStandardVersion({
            standardId: mockStandard.id,
            version: 1,
          });

          const newerVersion = createMockStandardVersion({
            standardId: mockStandard.id,
            version: 2,
          });

          const olderDeployment = standardsDeploymentFactory({
            organizationId,
            target: mockTarget,
            status: DistributionStatus.success,
            standardVersions: [olderVersion],
            createdAt: '2023-01-01T00:00:00Z',
          });

          const newerDeployment = standardsDeploymentFactory({
            organizationId,
            target: mockTarget,
            status: DistributionStatus.success,
            standardVersions: [newerVersion],
            createdAt: '2023-01-02T00:00:00Z',
          });

          const targetDeployments = useCase.buildTargetDeploymentsForStandard(
            mockStandard,
            [olderDeployment, newerDeployment],
            [mockGitRepo],
          );

          expect(targetDeployments).toHaveLength(1);
          expect(targetDeployments[0].deployedVersion.version).toBe(2);
          expect(targetDeployments[0].deploymentDate).toBe(
            '2023-01-02T00:00:00Z',
          );
        });
      });
    });
  });
});
