import {
  ISkillsPort,
  IGitPort,
  OrganizationId,
  UserId,
  Skill,
  GitRepo,
  GetSkillDeploymentOverviewCommand,
  DistributionStatus,
  createSkillVersionId,
  createSkillId,
  ISpacesPort,
  Space,
  createSpaceId,
  SkillDeploymentOverview,
  Distribution,
  SkillVersion,
  Target,
  createDistributedPackageId,
  createPackageId,
  PackageId,
  DistributionOperation,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { gitRepoFactory } from '@packmind/git/test';
import { skillFactory, skillVersionFactory } from '@packmind/skills/test';
import { GetSkillsDeploymentOverviewUseCase } from './GetSkillsDeploymentOverviewUseCase';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { targetFactory } from '../../../test/targetFactory';
import { distributionFactory } from '../../../test/distributionFactory';
import { v4 as uuidv4 } from 'uuid';

function createDistributionWithSkills(params: {
  organizationId: OrganizationId;
  target?: Target;
  status?: DistributionStatus;
  skillVersions?: SkillVersion[];
  createdAt?: string;
  packageId?: PackageId;
  operation?: DistributionOperation;
}): Distribution {
  const baseDistribution = distributionFactory({
    organizationId: params.organizationId,
    target: params.target,
    status: params.status,
    createdAt: params.createdAt,
  });

  return {
    ...baseDistribution,
    distributedPackages: [
      {
        id: createDistributedPackageId(uuidv4()),
        distributionId: baseDistribution.id,
        packageId: params.packageId || createPackageId(uuidv4()),
        recipeVersions: [],
        standardVersions: [],
        skillVersions: params.skillVersions || [],
        operation: params.operation || 'add',
      },
    ],
  };
}

describe('GetSkillsDeploymentOverviewUseCase', () => {
  let useCase: GetSkillsDeploymentOverviewUseCase;
  let mockDistributionRepository: jest.Mocked<IDistributionRepository>;
  let mockSkillsPort: jest.Mocked<ISkillsPort>;
  let mockGitPort: jest.Mocked<IGitPort>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  const logger = stubLogger();

  const organizationId = 'org-123' as OrganizationId;
  const userId = 'user-123' as UserId;

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

    mockSkillsPort = {
      listSkillsBySpace: jest.fn(),
    } as unknown as jest.Mocked<ISkillsPort>;

    mockGitPort = {
      getOrganizationRepositories: jest.fn(),
    } as unknown as jest.Mocked<IGitPort>;

    mockSpacesPort = {
      listSpacesByOrganization: jest.fn(),
      createSpace: jest.fn(),
      getSpaceBySlug: jest.fn(),
      getSpaceById: jest.fn(),
    } as jest.Mocked<ISpacesPort>;

    useCase = new GetSkillsDeploymentOverviewUseCase(
      mockDistributionRepository,
      mockSkillsPort,
      mockGitPort,
      mockSpacesPort,
      logger,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('when getting skills deployment overview', () => {
    const mockDistributions: Distribution[] = [];
    const mockSkills: Skill[] = [];
    const mockGitRepos: GitRepo[] = [];
    const mockSpace: Space = {
      id: createSpaceId('space-1'),
      name: 'Global',
      slug: 'global',
      organizationId,
    };

    let result: SkillDeploymentOverview;

    beforeEach(async () => {
      const command: GetSkillDeploymentOverviewCommand = {
        organizationId,
        userId,
      };

      mockDistributionRepository.listByOrganizationIdWithStatus.mockResolvedValue(
        mockDistributions,
      );
      mockSpacesPort.listSpacesByOrganization.mockResolvedValue([mockSpace]);
      mockSkillsPort.listSkillsBySpace.mockResolvedValue(mockSkills);
      mockGitPort.getOrganizationRepositories.mockResolvedValue(mockGitRepos);

      result = await useCase.execute(command);
    });

    it('returns expected empty overview', () => {
      expect(result).toEqual({
        repositories: [],
        targets: [],
        skills: [],
      });
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

    it('fetches skills by space', () => {
      expect(mockSkillsPort.listSkillsBySpace).toHaveBeenCalledWith(
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

  describe('when deployments with targets exist', () => {
    const mockGitRepo = gitRepoFactory();
    const mockTarget = targetFactory({ gitRepoId: mockGitRepo.id });
    const mockSkill = skillFactory({
      id: createSkillId('skill-1'),
      name: 'Test Skill',
      version: 2,
    });
    const mockSpace: Space = {
      id: createSpaceId('space-1'),
      name: 'Global',
      slug: 'global',
      organizationId,
    };

    let result: SkillDeploymentOverview;

    beforeEach(async () => {
      const command: GetSkillDeploymentOverviewCommand = {
        organizationId,
        userId,
      };

      const mockSkillVersion = skillVersionFactory({
        id: createSkillVersionId('skill-version-1'),
        skillId: mockSkill.id,
        version: 1,
      });

      const mockDistribution = createDistributionWithSkills({
        organizationId,
        target: mockTarget,
        status: DistributionStatus.success,
        skillVersions: [mockSkillVersion],
      });

      mockDistributionRepository.listByOrganizationIdWithStatus.mockResolvedValue(
        [mockDistribution],
      );
      mockSpacesPort.listSpacesByOrganization.mockResolvedValue([mockSpace]);
      mockSkillsPort.listSkillsBySpace.mockResolvedValue([mockSkill]);
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

      it('returns target with one deployed skill', () => {
        expect(result.targets[0].deployedSkills).toHaveLength(1);
      });

      it('marks target as having outdated skills', () => {
        expect(result.targets[0].hasOutdatedSkills).toBe(true);
      });
    });

    describe('skill-centric deployment information', () => {
      it('returns one skill', () => {
        expect(result.skills).toHaveLength(1);
      });

      it('returns skill with correct id', () => {
        expect(result.skills[0].skill.id).toBe(mockSkill.id);
      });

      it('returns skill with one target deployment', () => {
        expect(result.skills[0].targetDeployments).toHaveLength(1);
      });

      it('returns target deployment with correct target id', () => {
        expect(result.skills[0].targetDeployments[0].target.id).toBe(
          mockTarget.id,
        );
      });

      it('marks target deployment as not up to date', () => {
        expect(result.skills[0].targetDeployments[0].isUpToDate).toBe(false);
      });

      it('marks skill as having outdated deployments', () => {
        expect(result.skills[0].hasOutdatedDeployments).toBe(true);
      });
    });
  });

  describe('when a deployed skill has been deleted', () => {
    const mockGitRepo = gitRepoFactory();
    const mockTarget = targetFactory({ gitRepoId: mockGitRepo.id });
    const mockActiveSkill = skillFactory({
      id: createSkillId('active-skill'),
      name: 'Active Skill',
      version: 1,
    });
    const mockDeletedSkill = skillFactory({
      id: createSkillId('deleted-skill'),
      name: 'Deleted Skill',
      version: 1,
    });

    const mockSpace: Space = {
      id: createSpaceId('space-1'),
      name: 'Global',
      slug: 'global',
      organizationId,
    };

    let result: SkillDeploymentOverview;

    beforeEach(async () => {
      const command: GetSkillDeploymentOverviewCommand = {
        organizationId,
        userId,
      };

      const activeSkillVersion = skillVersionFactory({
        skillId: mockActiveSkill.id,
        version: 1,
      });

      const deletedSkillVersion = skillVersionFactory({
        skillId: mockDeletedSkill.id,
        version: 1,
      });

      const mockDistribution = createDistributionWithSkills({
        organizationId,
        target: mockTarget,
        status: DistributionStatus.success,
        skillVersions: [activeSkillVersion, deletedSkillVersion],
      });

      mockDistributionRepository.listByOrganizationIdWithStatus.mockResolvedValue(
        [mockDistribution],
      );
      mockSpacesPort.listSpacesByOrganization.mockResolvedValue([mockSpace]);

      // First call returns only active skills
      // Second call (with includeDeleted) returns all skills
      mockSkillsPort.listSkillsBySpace
        .mockResolvedValueOnce([mockActiveSkill])
        .mockResolvedValueOnce([mockActiveSkill, mockDeletedSkill]);

      mockGitPort.getOrganizationRepositories.mockResolvedValue([mockGitRepo]);

      result = await useCase.execute(command);
    });

    it('returns two skills', () => {
      expect(result.skills).toHaveLength(2);
    });

    it('marks active skill as not deleted', () => {
      const activeSkillStatus = result.skills.find(
        (s) => s.skill.id === mockActiveSkill.id,
      );
      expect(activeSkillStatus?.isDeleted).toBeUndefined();
    });

    it('marks deleted skill with isDeleted true', () => {
      const deletedSkillStatus = result.skills.find(
        (s) => s.skill.id === mockDeletedSkill.id,
      );
      expect(deletedSkillStatus?.isDeleted).toBe(true);
    });

    it('calls listSkillsBySpace twice to fetch deleted skills', () => {
      expect(mockSkillsPort.listSkillsBySpace).toHaveBeenCalledTimes(2);
    });

    it('calls listSkillsBySpace with includeDeleted option', () => {
      expect(mockSkillsPort.listSkillsBySpace).toHaveBeenNthCalledWith(
        2,
        mockSpace.id,
        organizationId,
        userId,
        { includeDeleted: true },
      );
    });
  });

  describe('when a package is redistributed without a skill', () => {
    const mockGitRepo = gitRepoFactory();
    const mockTarget = targetFactory({ gitRepoId: mockGitRepo.id });
    const mockSkill = skillFactory({
      id: createSkillId('skill-to-remove'),
      name: 'Skill To Remove',
      version: 1,
    });
    const mockSpace: Space = {
      id: createSpaceId('space-1'),
      name: 'Global',
      slug: 'global',
      organizationId,
    };
    const packageId = createPackageId('package-1');

    let result: SkillDeploymentOverview;

    beforeEach(async () => {
      const command: GetSkillDeploymentOverviewCommand = {
        organizationId,
        userId,
      };

      const skillVersion = skillVersionFactory({
        skillId: mockSkill.id,
        version: 1,
      });

      // First distribution: package with skill (older)
      const firstDistribution = createDistributionWithSkills({
        organizationId,
        target: mockTarget,
        status: DistributionStatus.success,
        skillVersions: [skillVersion],
        createdAt: '2024-01-01T00:00:00Z',
        packageId,
      });

      // Second distribution: same package without skill (newer)
      const secondDistribution = createDistributionWithSkills({
        organizationId,
        target: mockTarget,
        status: DistributionStatus.success,
        skillVersions: [], // Skill removed from package
        createdAt: '2024-01-02T00:00:00Z',
        packageId,
      });

      mockDistributionRepository.listByOrganizationIdWithStatus.mockResolvedValue(
        [firstDistribution, secondDistribution],
      );
      mockSpacesPort.listSpacesByOrganization.mockResolvedValue([mockSpace]);
      mockSkillsPort.listSkillsBySpace.mockResolvedValue([mockSkill]);
      mockGitPort.getOrganizationRepositories.mockResolvedValue([mockGitRepo]);

      result = await useCase.execute(command);
    });

    it('does not include skill in target view after redistribution', () => {
      expect(result.targets[0].deployedSkills).toHaveLength(0);
    });

    it('does not include skill in skill-centric view for this target', () => {
      const skillStatus = result.skills.find(
        (s) => s.skill.id === mockSkill.id,
      );
      expect(skillStatus?.targetDeployments).toHaveLength(0);
    });

    it('marks target as not having outdated skills', () => {
      expect(result.targets[0].hasOutdatedSkills).toBe(false);
    });
  });

  describe('when skill exists in multiple packages and only one is redistributed without it', () => {
    const mockGitRepo = gitRepoFactory();
    const mockTarget = targetFactory({ gitRepoId: mockGitRepo.id });
    const mockSkill = skillFactory({
      id: createSkillId('shared-skill'),
      name: 'Shared Skill',
      version: 1,
    });
    const mockSpace: Space = {
      id: createSpaceId('space-1'),
      name: 'Global',
      slug: 'global',
      organizationId,
    };
    const packageIdA = createPackageId('package-a');
    const packageIdB = createPackageId('package-b');

    let result: SkillDeploymentOverview;

    beforeEach(async () => {
      const command: GetSkillDeploymentOverviewCommand = {
        organizationId,
        userId,
      };

      const skillVersion = skillVersionFactory({
        skillId: mockSkill.id,
        version: 1,
      });

      // Package A: first has skill, then redistributed without skill
      const packageAFirstDist = createDistributionWithSkills({
        organizationId,
        target: mockTarget,
        status: DistributionStatus.success,
        skillVersions: [skillVersion],
        createdAt: '2024-01-01T00:00:00Z',
        packageId: packageIdA,
      });

      const packageASecondDist = createDistributionWithSkills({
        organizationId,
        target: mockTarget,
        status: DistributionStatus.success,
        skillVersions: [], // Skill removed
        createdAt: '2024-01-03T00:00:00Z',
        packageId: packageIdA,
      });

      // Package B: still has the skill
      const packageBDist = createDistributionWithSkills({
        organizationId,
        target: mockTarget,
        status: DistributionStatus.success,
        skillVersions: [skillVersion],
        createdAt: '2024-01-02T00:00:00Z',
        packageId: packageIdB,
      });

      mockDistributionRepository.listByOrganizationIdWithStatus.mockResolvedValue(
        [packageAFirstDist, packageASecondDist, packageBDist],
      );
      mockSpacesPort.listSpacesByOrganization.mockResolvedValue([mockSpace]);
      mockSkillsPort.listSkillsBySpace.mockResolvedValue([mockSkill]);
      mockGitPort.getOrganizationRepositories.mockResolvedValue([mockGitRepo]);

      result = await useCase.execute(command);
    });

    it('still shows skill in target view because Package B still has it', () => {
      expect(result.targets[0].deployedSkills).toHaveLength(1);
    });

    it('shows skill is up to date', () => {
      expect(result.targets[0].deployedSkills[0].isUpToDate).toBe(true);
    });

    it('still shows skill in skill-centric view for this target', () => {
      const skillStatus = result.skills.find(
        (s) => s.skill.id === mockSkill.id,
      );
      expect(skillStatus?.targetDeployments).toHaveLength(1);
    });
  });

  describe('when multiple redistributions of same package occur', () => {
    const mockGitRepo = gitRepoFactory();
    const mockTarget = targetFactory({ gitRepoId: mockGitRepo.id });
    const mockSkillV1 = skillFactory({
      id: createSkillId('evolving-skill'),
      name: 'Evolving Skill',
      version: 3,
    });
    const mockSpace: Space = {
      id: createSpaceId('space-1'),
      name: 'Global',
      slug: 'global',
      organizationId,
    };
    const packageId = createPackageId('package-1');

    let result: SkillDeploymentOverview;

    beforeEach(async () => {
      const command: GetSkillDeploymentOverviewCommand = {
        organizationId,
        userId,
      };

      const skillVersionV1 = skillVersionFactory({
        skillId: mockSkillV1.id,
        version: 1,
      });

      const skillVersionV2 = skillVersionFactory({
        skillId: mockSkillV1.id,
        version: 2,
      });

      // First distribution: version 1 (oldest)
      const firstDistribution = createDistributionWithSkills({
        organizationId,
        target: mockTarget,
        status: DistributionStatus.success,
        skillVersions: [skillVersionV1],
        createdAt: '2024-01-01T00:00:00Z',
        packageId,
      });

      // Second distribution: version 2 (newest)
      const secondDistribution = createDistributionWithSkills({
        organizationId,
        target: mockTarget,
        status: DistributionStatus.success,
        skillVersions: [skillVersionV2],
        createdAt: '2024-01-02T00:00:00Z',
        packageId,
      });

      mockDistributionRepository.listByOrganizationIdWithStatus.mockResolvedValue(
        [firstDistribution, secondDistribution],
      );
      mockSpacesPort.listSpacesByOrganization.mockResolvedValue([mockSpace]);
      mockSkillsPort.listSkillsBySpace.mockResolvedValue([mockSkillV1]);
      mockGitPort.getOrganizationRepositories.mockResolvedValue([mockGitRepo]);

      result = await useCase.execute(command);
    });

    it('shows only the latest deployed version', () => {
      expect(result.targets[0].deployedSkills[0].deployedVersion.version).toBe(
        2,
      );
    });

    it('marks skill as outdated because latest is version 3', () => {
      expect(result.targets[0].deployedSkills[0].isUpToDate).toBe(false);
    });

    it('shows latest version in skill-centric view', () => {
      expect(
        result.skills[0].targetDeployments[0].deployedVersion.version,
      ).toBe(2);
    });
  });

  describe('when repository throws an error', () => {
    it('logs error and re-throws', async () => {
      const command: GetSkillDeploymentOverviewCommand = {
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
});
