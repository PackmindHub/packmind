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
  PackageId,
  TargetId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import {
  IDistributionRepository,
  LatestPackageOperationRow,
} from '../../domain/repositories/IDistributionRepository';
import {
  ListActiveDistributedPackagesBySpaceUseCase,
  projectActiveDistributedPackagesByTarget,
} from './ListActiveDistributedPackagesBySpaceUseCase';

describe('ListActiveDistributedPackagesBySpaceUseCase', () => {
  let useCase: ListActiveDistributedPackagesBySpaceUseCase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  let distributionRepository: jest.Mocked<
    Pick<IDistributionRepository, 'findLatestPackageOperationsBySpace'>
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

  const row = (
    targetId: TargetId,
    packageId: PackageId,
    operation: 'add' | 'remove',
    status: DistributionStatus,
  ): LatestPackageOperationRow => ({ targetId, packageId, operation, status });

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
      findLatestPackageOperationsBySpace: jest.fn(),
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

    it('returns the package id when the latest operation is a successful add', async () => {
      const targetId = createTargetId(uuidv4());
      const packageId = createPackageId(uuidv4());

      distributionRepository.findLatestPackageOperationsBySpace.mockResolvedValue(
        [row(targetId, packageId, 'add', DistributionStatus.success)],
      );

      const result = await useCase.execute(command);

      expect(result).toEqual([{ targetId, packageIds: [packageId] }]);
    });

    it('excludes the package when the latest operation is a successful remove', async () => {
      const targetId = createTargetId(uuidv4());
      const packageId = createPackageId(uuidv4());

      distributionRepository.findLatestPackageOperationsBySpace.mockResolvedValue(
        [row(targetId, packageId, 'remove', DistributionStatus.success)],
      );

      const result = await useCase.execute(command);

      expect(result).toEqual([]);
    });

    it('includes the package when the latest operation is a failed remove', async () => {
      const targetId = createTargetId(uuidv4());
      const packageId = createPackageId(uuidv4());

      distributionRepository.findLatestPackageOperationsBySpace.mockResolvedValue(
        [row(targetId, packageId, 'remove', DistributionStatus.failure)],
      );

      const result = await useCase.execute(command);

      expect(result).toEqual([{ targetId, packageIds: [packageId] }]);
    });

    it('excludes the package when the latest operation is a failed add', async () => {
      const targetId = createTargetId(uuidv4());
      const packageId = createPackageId(uuidv4());

      distributionRepository.findLatestPackageOperationsBySpace.mockResolvedValue(
        [row(targetId, packageId, 'add', DistributionStatus.failure)],
      );

      const result = await useCase.execute(command);

      expect(result).toEqual([]);
    });

    it('queries the repository with the requested space id', async () => {
      const targetId = createTargetId(uuidv4());
      const packageId = createPackageId(uuidv4());

      distributionRepository.findLatestPackageOperationsBySpace.mockResolvedValue(
        [row(targetId, packageId, 'add', DistributionStatus.success)],
      );

      const result = await useCase.execute(command);

      expect(
        distributionRepository.findLatestPackageOperationsBySpace,
      ).toHaveBeenCalledWith(spaceId);
      expect(result).toEqual([{ targetId, packageIds: [packageId] }]);
    });
  });
});

describe('projectActiveDistributedPackagesByTarget', () => {
  const row = (
    targetId: TargetId,
    packageId: PackageId,
    operation: 'add' | 'remove',
    status: DistributionStatus,
  ): LatestPackageOperationRow => ({ targetId, packageId, operation, status });

  it('returns empty array when there are no rows', () => {
    expect(projectActiveDistributedPackagesByTarget([])).toEqual([]);
  });

  it('groups active packages by target', () => {
    const targetId1 = createTargetId(uuidv4());
    const targetId2 = createTargetId(uuidv4());
    const packageId1 = createPackageId(uuidv4());
    const packageId2 = createPackageId(uuidv4());

    const result = projectActiveDistributedPackagesByTarget([
      row(targetId1, packageId1, 'add', DistributionStatus.success),
      row(targetId2, packageId2, 'add', DistributionStatus.success),
    ]);

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

  it('aggregates multiple packages under the same target', () => {
    const targetId = createTargetId(uuidv4());
    const packageId1 = createPackageId(uuidv4());
    const packageId2 = createPackageId(uuidv4());

    const result = projectActiveDistributedPackagesByTarget([
      row(targetId, packageId1, 'add', DistributionStatus.success),
      row(targetId, packageId2, 'add', DistributionStatus.success),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      targetId,
      packageIds: expect.arrayContaining([packageId1, packageId2]),
    });
  });
});
