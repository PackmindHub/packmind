import { MemberContext } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createPackageId,
  createSpaceId,
  createStandardId,
  createTargetId,
  createUserId,
  DistributionStatus,
  IAccountsPort,
  ISpacesPort,
  ListDriftedPackagesByOrgCommand,
  Organization,
  Package,
  PackageId,
  Space,
  SpaceType,
  StandardId,
  TargetId,
  User,
  UserOrganizationMembership,
} from '@packmind/types';
import {
  IDistributionRepository,
  OutdatedDeploymentsByTarget,
  ActivePackageOperationRow,
} from '../../domain/repositories/IDistributionRepository';
import { IPackageRepository } from '../../domain/repositories/IPackageRepository';
import { ListDriftedPackagesByOrgUseCase } from './ListDriftedPackagesByOrgUseCase';

const orgId = createOrganizationId('org-1');
const userId = createUserId('user-1');

const space = (id: string, slug: string, name: string): Space => ({
  id: createSpaceId(id),
  name,
  slug,
  type: SpaceType.open,
  organizationId: orgId,
  isDefaultSpace: false,
});

const pkg = (
  id: string,
  name: string,
  spaceId: ReturnType<typeof createSpaceId>,
  standards: StandardId[] = [],
): Package => ({
  id: createPackageId(id),
  name,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  description: '',
  spaceId,
  createdBy: userId,
  recipes: [],
  standards,
  skills: [],
});

const activeOp = (
  packageId: PackageId,
  targetId: TargetId,
  lastDistributedAt = '2026-06-15T10:00:00.000Z',
): ActivePackageOperationRow => ({
  packageId,
  targetId,
  lastDistributionStatus: DistributionStatus.success,
  lastDistributedAt,
});

const outdatedOnTarget = (
  targetId: TargetId,
  outdatedStandardIds: StandardId[],
): OutdatedDeploymentsByTarget => ({
  targetId,
  targetName: `target-${targetId}`,
  gitRepoId: 'repo-1',
  standards: outdatedStandardIds.map((id) => ({
    artifactId: id,
    artifactName: 'std',
    artifactSlug: 'std',
    deployedVersion: 1,
    deploymentDate: '2026-06-10T10:00:00.000Z',
    isDeleted: false,
  })),
  recipes: [],
  skills: [],
});

describe('ListDriftedPackagesByOrgUseCase', () => {
  let useCase: ListDriftedPackagesByOrgUseCase;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockDistributionRepository: jest.Mocked<IDistributionRepository>;
  let mockPackageRepository: jest.Mocked<IPackageRepository>;

  const ctx: MemberContext = {
    user: { id: userId } as User,
    organization: { id: orgId } as Organization,
    membership: {} as UserOrganizationMembership,
  };

  const baseCommand: ListDriftedPackagesByOrgCommand & MemberContext = {
    userId: String(userId),
    organizationId: orgId,
    ...ctx,
  };

  beforeEach(() => {
    mockSpacesPort = {
      listSpacesByOrganization: jest.fn(),
    } as unknown as jest.Mocked<ISpacesPort>;

    mockAccountsPort = {} as unknown as jest.Mocked<IAccountsPort>;

    mockDistributionRepository = {
      findOutdatedDeploymentsBySpace: jest.fn(),
      findActivePackageOperationsBySpace: jest.fn(),
    } as unknown as jest.Mocked<IDistributionRepository>;

    mockPackageRepository = {
      findBySpaceId: jest.fn(),
    } as unknown as jest.Mocked<IPackageRepository>;

    useCase = new ListDriftedPackagesByOrgUseCase(
      mockSpacesPort,
      mockAccountsPort,
      mockDistributionRepository,
      mockPackageRepository,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeForMembers', () => {
    describe('when the organization has no spaces', () => {
      beforeEach(() => {
        mockSpacesPort.listSpacesByOrganization.mockResolvedValue([]);
      });

      it('returns an empty list', async () => {
        const result = await useCase['executeForMembers'](baseCommand);
        expect(result).toEqual([]);
      });
    });

    describe('when no package drifts', () => {
      beforeEach(() => {
        mockSpacesPort.listSpacesByOrganization.mockResolvedValue([
          space('space-1', 'space-one', 'Space One'),
        ]);
        mockDistributionRepository.findOutdatedDeploymentsBySpace.mockResolvedValue(
          [],
        );
        mockDistributionRepository.findActivePackageOperationsBySpace.mockResolvedValue(
          [activeOp(createPackageId('pkg-1'), createTargetId('target-1'))],
        );
        mockPackageRepository.findBySpaceId.mockResolvedValue([
          pkg('pkg-1', 'pkg one', createSpaceId('space-1'), [
            createStandardId('std-1'),
          ]),
        ]);
      });

      it('returns an empty list', async () => {
        const result = await useCase['executeForMembers'](baseCommand);
        expect(result).toEqual([]);
      });
    });

    describe('when a package drifts on two targets in the same space', () => {
      const spaceId = createSpaceId('space-1');
      const packageId = createPackageId('pkg-1');
      const standardId = createStandardId('std-1');
      const target1 = createTargetId('target-1');
      const target2 = createTargetId('target-2');

      beforeEach(() => {
        mockSpacesPort.listSpacesByOrganization.mockResolvedValue([
          space('space-1', 'design-system', 'Design System'),
        ]);
        mockDistributionRepository.findOutdatedDeploymentsBySpace.mockResolvedValue(
          [
            outdatedOnTarget(target1, [standardId]),
            outdatedOnTarget(target2, [standardId]),
          ],
        );
        mockDistributionRepository.findActivePackageOperationsBySpace.mockResolvedValue(
          [
            activeOp(packageId, target1, '2026-06-15T10:00:00.000Z'),
            activeOp(packageId, target2, '2026-06-16T12:00:00.000Z'),
          ],
        );
        mockPackageRepository.findBySpaceId.mockResolvedValue([
          pkg('pkg-1', 'packmind-ui', spaceId, [standardId]),
        ]);
      });

      it('counts two behind distributions and reports the latest lastUpdatedAt', async () => {
        const result = await useCase['executeForMembers'](baseCommand);
        expect(result).toEqual([
          {
            packageId,
            packageName: 'packmind-ui',
            spaceId,
            spaceSlug: 'design-system',
            spaceName: 'Design System',
            behindDistributions: 2,
            lastUpdatedAt: '2026-06-16T12:00:00.000Z',
          },
        ]);
      });
    });

    describe('when several packages drift across two spaces', () => {
      const spaceA = createSpaceId('space-a');
      const spaceB = createSpaceId('space-b');
      const pkgA = createPackageId('pkg-a');
      const pkgB = createPackageId('pkg-b');
      const stdA = createStandardId('std-a');
      const stdB = createStandardId('std-b');
      const tgtA = createTargetId('tgt-a');
      const tgtB = createTargetId('tgt-b');

      beforeEach(() => {
        mockSpacesPort.listSpacesByOrganization.mockResolvedValue([
          space('space-a', 'space-a', 'Space A'),
          space('space-b', 'space-b', 'Space B'),
        ]);
        mockDistributionRepository.findOutdatedDeploymentsBySpace.mockImplementation(
          async (_orgId, sId) => {
            if (sId === spaceA) {
              return [outdatedOnTarget(tgtA, [stdA])];
            }
            return [outdatedOnTarget(tgtB, [stdB])];
          },
        );
        mockDistributionRepository.findActivePackageOperationsBySpace.mockImplementation(
          async (sId) => {
            if (sId === spaceA) {
              return [activeOp(pkgA, tgtA)];
            }
            return [activeOp(pkgB, tgtB)];
          },
        );
        mockPackageRepository.findBySpaceId.mockImplementation(async (sId) => {
          if (sId === spaceA) {
            return [pkg('pkg-a', 'beta', spaceA, [stdA])];
          }
          return [pkg('pkg-b', 'alpha', spaceB, [stdB])];
        });
      });

      it('sorts by behindDistributions desc then name asc and tags each row with its space', async () => {
        const result = await useCase['executeForMembers'](baseCommand);
        expect(
          result.map((r) => ({ name: r.packageName, space: r.spaceSlug })),
        ).toEqual([
          { name: 'alpha', space: 'space-b' },
          { name: 'beta', space: 'space-a' },
        ]);
      });
    });

    describe('when a target has outdated artifacts that do not belong to the active package', () => {
      const spaceId = createSpaceId('space-1');
      const pkgId = createPackageId('pkg-1');
      const ownedStd = createStandardId('std-owned');
      const otherStd = createStandardId('std-other');
      const target = createTargetId('target-1');

      beforeEach(() => {
        mockSpacesPort.listSpacesByOrganization.mockResolvedValue([
          space('space-1', 'space-one', 'Space One'),
        ]);
        mockDistributionRepository.findOutdatedDeploymentsBySpace.mockResolvedValue(
          [outdatedOnTarget(target, [otherStd])],
        );
        mockDistributionRepository.findActivePackageOperationsBySpace.mockResolvedValue(
          [activeOp(pkgId, target)],
        );
        mockPackageRepository.findBySpaceId.mockResolvedValue([
          pkg('pkg-1', 'pkg one', spaceId, [ownedStd]),
        ]);
      });

      it('does not attribute drift to that package', async () => {
        const result = await useCase['executeForMembers'](baseCommand);
        expect(result).toEqual([]);
      });
    });
  });
});
