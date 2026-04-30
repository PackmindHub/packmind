import { PackmindLogger } from '@packmind/logger';
import { SpaceMembershipRequiredError } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createPackageId,
  createSpaceId,
  createTargetId,
  createUserId,
  DistributionStatus,
  IAccountsPort,
  ISpacesPort,
  ListActiveDistributedPackagesBySpaceCommand,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { distributionFactory, targetFactory } from '../../../test';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import {
  ListActiveDistributedPackagesBySpaceUseCase,
  projectActiveDistributedPackagesByTarget,
} from './ListActiveDistributedPackagesBySpaceUseCase';

describe('ListActiveDistributedPackagesBySpaceUseCase', () => {
  let useCase: ListActiveDistributedPackagesBySpaceUseCase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  let distributionRepository: jest.Mocked<
    Pick<IDistributionRepository, 'findBySpaceId'>
  >;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const spaceId = createSpaceId(uuidv4());

  const buildUser = () => ({
    id: userId,
    email: 'test@example.com',
    passwordHash: 'hash',
    active: true,
    memberships: [
      {
        userId,
        organizationId,
        role: 'member' as const,
      },
    ],
  });

  const buildOrganization = () => ({
    id: organizationId,
    name: 'Test Organization',
    slug: 'test-org',
  });

  const command: ListActiveDistributedPackagesBySpaceCommand = {
    userId,
    organizationId,
    spaceId,
  };

  beforeEach(() => {
    mockAccountsPort = {
      getUserById: jest.fn().mockResolvedValue(buildUser()),
      getOrganizationById: jest.fn().mockResolvedValue(buildOrganization()),
      isMemberOf: jest.fn().mockResolvedValue(true),
      isAdminOf: jest.fn(),
      getOrganizationIdBySlug: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    mockSpacesPort = {
      getSpaceById: jest.fn(),
      getSpaceBySlug: jest.fn(),
      listSpacesByOrganization: jest.fn(),
      findMembership: jest.fn().mockResolvedValue({
        userId,
        spaceId,
      }),
    } as unknown as jest.Mocked<ISpacesPort>;

    distributionRepository = {
      findBySpaceId: jest.fn(),
    };

    stubbedLogger = stubLogger();

    useCase = new ListActiveDistributedPackagesBySpaceUseCase(
      mockSpacesPort,
      mockAccountsPort,
      distributionRepository as unknown as IDistributionRepository,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when the user is not a member of the space', () => {
      it('throws a SpaceMembershipRequiredError', async () => {
        mockSpacesPort.findMembership.mockResolvedValue(null);

        await expect(useCase.execute(command)).rejects.toThrow(
          SpaceMembershipRequiredError,
        );
      });
    });

    it('returns the package id when the latest distribution is a successful add', async () => {
      const targetId = createTargetId(uuidv4());
      const packageId = createPackageId(uuidv4());
      const distribution = distributionFactory({
        target: targetFactory({ id: targetId }),
        status: DistributionStatus.success,
        distributedPackages: [
          {
            id: distribution_package_id(),
            distributionId: distribution_id(),
            packageId,
            operation: 'add',
            standardVersions: [],
            recipeVersions: [],
            skillVersions: [],
          },
        ],
        createdAt: new Date('2026-04-29').toISOString(),
      });

      distributionRepository.findBySpaceId.mockResolvedValue([distribution]);

      const result = await useCase.execute(command);

      expect(result).toEqual([{ targetId, packageIds: [packageId] }]);
    });

    it('excludes the package when the latest distribution is a successful remove', async () => {
      const targetId = createTargetId(uuidv4());
      const packageId = createPackageId(uuidv4());

      const addDistribution = distributionFactory({
        target: targetFactory({ id: targetId }),
        status: DistributionStatus.success,
        distributedPackages: [
          {
            id: distribution_package_id(),
            distributionId: distribution_id(),
            packageId,
            operation: 'add',
            standardVersions: [],
            recipeVersions: [],
            skillVersions: [],
          },
        ],
        createdAt: new Date('2026-04-28').toISOString(),
      });

      const removeDistribution = distributionFactory({
        target: targetFactory({ id: targetId }),
        status: DistributionStatus.success,
        distributedPackages: [
          {
            id: distribution_package_id(),
            distributionId: distribution_id(),
            packageId,
            operation: 'remove',
            standardVersions: [],
            recipeVersions: [],
            skillVersions: [],
          },
        ],
        createdAt: new Date('2026-04-29').toISOString(),
      });

      distributionRepository.findBySpaceId.mockResolvedValue([
        removeDistribution,
        addDistribution,
      ]);

      const result = await useCase.execute(command);

      expect(result).toEqual([]);
    });

    it('includes the package when the latest distribution is a failed remove', async () => {
      const targetId = createTargetId(uuidv4());
      const packageId = createPackageId(uuidv4());

      const addDistribution = distributionFactory({
        target: targetFactory({ id: targetId }),
        status: DistributionStatus.success,
        distributedPackages: [
          {
            id: distribution_package_id(),
            distributionId: distribution_id(),
            packageId,
            operation: 'add',
            standardVersions: [],
            recipeVersions: [],
            skillVersions: [],
          },
        ],
        createdAt: new Date('2026-04-28').toISOString(),
      });

      const failedRemoveDistribution = distributionFactory({
        target: targetFactory({ id: targetId }),
        status: DistributionStatus.failure,
        distributedPackages: [
          {
            id: distribution_package_id(),
            distributionId: distribution_id(),
            packageId,
            operation: 'remove',
            standardVersions: [],
            recipeVersions: [],
            skillVersions: [],
          },
        ],
        createdAt: new Date('2026-04-29').toISOString(),
      });

      distributionRepository.findBySpaceId.mockResolvedValue([
        failedRemoveDistribution,
        addDistribution,
      ]);

      const result = await useCase.execute(command);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ targetId, packageIds: [packageId] }),
        ]),
      );
    });

    it('excludes the package when the latest distribution is a failed add', async () => {
      const targetId = createTargetId(uuidv4());
      const packageId = createPackageId(uuidv4());

      const failedAddDistribution = distributionFactory({
        target: targetFactory({ id: targetId }),
        status: DistributionStatus.failure,
        distributedPackages: [
          {
            id: distribution_package_id(),
            distributionId: distribution_id(),
            packageId,
            operation: 'add',
            standardVersions: [],
            recipeVersions: [],
            skillVersions: [],
          },
        ],
        createdAt: new Date('2026-04-29').toISOString(),
      });

      distributionRepository.findBySpaceId.mockResolvedValue([
        failedAddDistribution,
      ]);

      const result = await useCase.execute(command);

      expect(result).toEqual([]);
    });

    it('returns only distributions scoped to packages from the queried space', async () => {
      const targetId = createTargetId(uuidv4());
      const packageId = createPackageId(uuidv4());

      // The repository already filters by spaceId; simulate it returning only in-space distributions
      const distribution = distributionFactory({
        target: targetFactory({ id: targetId }),
        status: DistributionStatus.success,
        distributedPackages: [
          {
            id: distribution_package_id(),
            distributionId: distribution_id(),
            packageId,
            operation: 'add',
            standardVersions: [],
            recipeVersions: [],
            skillVersions: [],
          },
        ],
        createdAt: new Date('2026-04-29').toISOString(),
      });

      distributionRepository.findBySpaceId.mockResolvedValue([distribution]);

      const result = await useCase.execute(command);

      expect(distributionRepository.findBySpaceId).toHaveBeenCalledWith(
        spaceId,
      );
      expect(result).toEqual([{ targetId, packageIds: [packageId] }]);
    });
  });
});

describe('projectActiveDistributedPackagesByTarget', () => {
  it('returns empty array when there are no distributions', () => {
    expect(projectActiveDistributedPackagesByTarget([])).toEqual([]);
  });

  it('groups active packages by target', () => {
    const targetId1 = createTargetId(uuidv4());
    const targetId2 = createTargetId(uuidv4());
    const packageId1 = createPackageId(uuidv4());
    const packageId2 = createPackageId(uuidv4());

    const dist1 = distributionFactory({
      target: targetFactory({ id: targetId1 }),
      status: DistributionStatus.success,
      distributedPackages: [
        {
          id: distribution_package_id(),
          distributionId: distribution_id(),
          packageId: packageId1,
          operation: 'add',
          standardVersions: [],
          recipeVersions: [],
          skillVersions: [],
        },
      ],
      createdAt: new Date('2026-04-29').toISOString(),
    });

    const dist2 = distributionFactory({
      target: targetFactory({ id: targetId2 }),
      status: DistributionStatus.success,
      distributedPackages: [
        {
          id: distribution_package_id(),
          distributionId: distribution_id(),
          packageId: packageId2,
          operation: 'add',
          standardVersions: [],
          recipeVersions: [],
          skillVersions: [],
        },
      ],
      createdAt: new Date('2026-04-29').toISOString(),
    });

    const result = projectActiveDistributedPackagesByTarget([dist1, dist2]);

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetId: targetId1,
          packageIds: [packageId1],
        }),
        expect.objectContaining({
          targetId: targetId2,
          packageIds: [packageId2],
        }),
      ]),
    );
  });
});

// Helpers to create unique IDs without importing createDistributedPackageId/createDistributionId
// in a way that would bloat the test - inline usage is clearer.
import {
  createDistributedPackageId,
  createDistributionId,
} from '@packmind/types';

function distribution_package_id() {
  return createDistributedPackageId(uuidv4());
}

function distribution_id() {
  return createDistributionId(uuidv4());
}
