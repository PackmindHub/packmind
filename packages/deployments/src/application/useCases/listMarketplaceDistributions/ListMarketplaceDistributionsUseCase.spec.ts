import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';
import {
  createMarketplaceDistributionId,
  createMarketplaceId,
  createOrganizationId,
  createPackageId,
  createUserId,
  DistributionStatus,
  IAccountsPort,
  ISpacesPort,
  Marketplace,
  MarketplaceDistribution,
  MarketplaceNotFoundError,
  Organization,
  Package,
  Space,
  SpaceId,
  SpaceType,
  User,
  createSpaceId,
} from '@packmind/types';
import { IMarketplaceRepository } from '../../../domain/repositories/IMarketplaceRepository';
import { IMarketplaceDistributionRepository } from '../../../domain/repositories/IMarketplaceDistributionRepository';
import { PackageService } from '../../services/PackageService';
import { ListMarketplaceDistributionsUseCase } from './ListMarketplaceDistributionsUseCase';

describe('ListMarketplaceDistributionsUseCase', () => {
  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());
  const marketplaceId = createMarketplaceId(uuidv4());
  const packageId = createPackageId(uuidv4());
  const spaceId: SpaceId = createSpaceId(uuidv4());

  const existingMarketplace = {
    id: marketplaceId,
    organizationId,
    name: 'ACME Plugins',
  } as unknown as Marketplace;

  const memberSpace: Space = {
    id: spaceId,
    name: 'Platform',
    slug: 'platform',
    type: SpaceType.open,
    organizationId,
    isDefaultSpace: false,
    color: 'teal',
  };

  const memberUser = {
    id: userId,
    email: 'admin@example.com',
    displayName: 'Author Person',
    passwordHash: null,
    active: true,
    memberships: [{ userId, organizationId, role: 'member' as const }],
    trial: false,
  } as unknown as User;

  const organization: Organization = {
    id: organizationId,
    name: 'Test Org',
    slug: 'test-org',
  };

  const distributionA = {
    id: createMarketplaceDistributionId(uuidv4()),
    organizationId,
    marketplaceId,
    packageId,
    pluginSlug: 'my-plugin',
    authorId: userId,
    status: DistributionStatus.success,
    source: 'app',
  } as unknown as MarketplaceDistribution;

  const removedDistribution = {
    id: createMarketplaceDistributionId(uuidv4()),
    organizationId,
    marketplaceId,
    packageId,
    pluginSlug: 'retired-plugin',
    authorId: userId,
    status: DistributionStatus.removed,
    source: 'app',
  } as unknown as MarketplaceDistribution;

  let mockMarketplaceRepository: jest.Mocked<IMarketplaceRepository>;
  let mockMarketplaceDistributionRepository: jest.Mocked<IMarketplaceDistributionRepository>;
  let mockPackageService: jest.Mocked<PackageService>;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  let useCase: ListMarketplaceDistributionsUseCase;

  beforeEach(() => {
    mockMarketplaceRepository = {
      findByOrganizationAndId: jest.fn().mockResolvedValue(existingMarketplace),
    } as unknown as jest.Mocked<IMarketplaceRepository>;

    mockMarketplaceDistributionRepository = {
      findByMarketplaceId: jest.fn().mockResolvedValue([distributionA]),
    } as unknown as jest.Mocked<IMarketplaceDistributionRepository>;

    mockPackageService = {
      findById: jest.fn().mockResolvedValue({
        id: packageId,
        name: 'My Package',
        slug: 'my-package',
        spaceId,
      } as Package),
    } as unknown as jest.Mocked<PackageService>;

    mockAccountsPort = {
      getUserById: jest.fn().mockResolvedValue(memberUser),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    mockSpacesPort = {
      getSpaceById: jest.fn().mockResolvedValue(memberSpace),
    } as unknown as jest.Mocked<ISpacesPort>;

    useCase = new ListMarketplaceDistributionsUseCase(
      mockMarketplaceRepository,
      mockMarketplaceDistributionRepository,
      mockPackageService,
      mockSpacesPort,
      mockAccountsPort,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('happy path', () => {
    let result: Awaited<
      ReturnType<ListMarketplaceDistributionsUseCase['execute']>
    >;

    beforeEach(async () => {
      result = await useCase.execute({
        userId,
        organizationId,
        marketplaceId,
      });
    });

    it('returns one item per distribution', () => {
      expect(result).toHaveLength(1);
    });

    it('enriches the row with the package name', () => {
      expect(result[0].packageName).toBe('My Package');
    });

    it('enriches the row with the package slug', () => {
      expect(result[0].packageSlug).toBe('my-package');
    });

    it('enriches the row with the author display name', () => {
      expect(result[0].authorName).toBe('Author Person');
    });

    it('preserves the distribution id', () => {
      expect(result[0].id).toEqual(distributionA.id);
    });

    it('preserves the plugin slug', () => {
      expect(result[0].pluginSlug).toBe('my-plugin');
    });

    it('preserves the distribution status', () => {
      expect(result[0].status).toBe(DistributionStatus.success);
    });

    it('enriches the row with the owning space', () => {
      expect(result[0].space).toEqual({
        id: spaceId,
        name: 'Platform',
        color: 'teal',
      });
    });
  });

  describe('when the owning space has been removed', () => {
    let result: Awaited<
      ReturnType<ListMarketplaceDistributionsUseCase['execute']>
    >;

    beforeEach(async () => {
      mockSpacesPort.getSpaceById = jest.fn().mockResolvedValue(null);
      result = await useCase.execute({
        userId,
        organizationId,
        marketplaceId,
      });
    });

    it('returns a null space rather than guessing', () => {
      expect(result[0].space).toBeNull();
    });
  });

  describe('when a package has multiple distributions', () => {
    const earlierFailure = {
      id: createMarketplaceDistributionId(uuidv4()),
      organizationId,
      marketplaceId,
      packageId,
      pluginSlug: 'my-plugin',
      authorId: userId,
      status: DistributionStatus.failed,
      source: 'app',
    } as unknown as MarketplaceDistribution;

    let result: Awaited<
      ReturnType<ListMarketplaceDistributionsUseCase['execute']>
    >;

    beforeEach(async () => {
      // Repository contract: rows are returned ordered by `createdAt DESC`,
      // so the latest attempt comes first and the earlier failure second.
      mockMarketplaceDistributionRepository.findByMarketplaceId.mockResolvedValue(
        [distributionA, earlierFailure],
      );
      result = await useCase.execute({
        userId,
        organizationId,
        marketplaceId,
      });
    });

    it('returns a single row for the package', () => {
      expect(result).toHaveLength(1);
    });

    it('keeps only the latest distribution', () => {
      expect(result[0].id).toEqual(distributionA.id);
    });

    it('drops the earlier failed attempt', () => {
      expect(result.map((item) => item.id)).toEqual([distributionA.id]);
    });
  });

  describe('when two packages each have multiple distributions', () => {
    const otherPackageId = createPackageId(uuidv4());

    const latestForOtherPackage = {
      id: createMarketplaceDistributionId(uuidv4()),
      organizationId,
      marketplaceId,
      packageId: otherPackageId,
      pluginSlug: 'other-plugin',
      authorId: userId,
      status: DistributionStatus.success,
      source: 'app',
    } as unknown as MarketplaceDistribution;

    const earlierFailureForOtherPackage = {
      id: createMarketplaceDistributionId(uuidv4()),
      organizationId,
      marketplaceId,
      packageId: otherPackageId,
      pluginSlug: 'other-plugin',
      authorId: userId,
      status: DistributionStatus.failed,
      source: 'app',
    } as unknown as MarketplaceDistribution;

    const earlierFailureForFirstPackage = {
      id: createMarketplaceDistributionId(uuidv4()),
      organizationId,
      marketplaceId,
      packageId,
      pluginSlug: 'my-plugin',
      authorId: userId,
      status: DistributionStatus.failed,
      source: 'app',
    } as unknown as MarketplaceDistribution;

    let result: Awaited<
      ReturnType<ListMarketplaceDistributionsUseCase['execute']>
    >;

    beforeEach(async () => {
      mockPackageService.findById = jest.fn().mockImplementation((pid) => {
        if (pid === packageId) {
          return Promise.resolve({
            id: packageId,
            name: 'My Package',
            slug: 'my-package',
            spaceId,
          } as Package);
        }
        if (pid === otherPackageId) {
          return Promise.resolve({
            id: otherPackageId,
            name: 'Other Package',
            slug: 'other-package',
            spaceId,
          } as Package);
        }
        return Promise.resolve(null);
      });

      mockMarketplaceDistributionRepository.findByMarketplaceId.mockResolvedValue(
        [
          distributionA,
          latestForOtherPackage,
          earlierFailureForFirstPackage,
          earlierFailureForOtherPackage,
        ],
      );

      result = await useCase.execute({
        userId,
        organizationId,
        marketplaceId,
      });
    });

    it('returns one row per package', () => {
      expect(result.map((item) => item.id)).toEqual([
        distributionA.id,
        latestForOtherPackage.id,
      ]);
    });
  });

  describe('lastPublishedOnMainAt enrichment', () => {
    describe('when the latest row is a successful publish', () => {
      const confirmedAt = new Date('2026-06-15T10:00:00.000Z');
      const successWithConfirmedAt = {
        ...distributionA,
        publishConfirmedAt: confirmedAt,
      } as MarketplaceDistribution;

      let result: Awaited<
        ReturnType<ListMarketplaceDistributionsUseCase['execute']>
      >;

      beforeEach(async () => {
        mockMarketplaceDistributionRepository.findByMarketplaceId.mockResolvedValue(
          [successWithConfirmedAt],
        );
        result = await useCase.execute({
          userId,
          organizationId,
          marketplaceId,
        });
      });

      it("uses the row's own publishConfirmedAt", () => {
        expect(result[0].lastPublishedOnMainAt).toEqual(confirmedAt);
      });
    });

    describe('when the latest row is pending_merge with no prior success', () => {
      const pendingMerge = {
        id: createMarketplaceDistributionId(uuidv4()),
        organizationId,
        marketplaceId,
        packageId,
        pluginSlug: 'my-plugin',
        authorId: userId,
        status: DistributionStatus.pending_merge,
        source: 'app',
      } as unknown as MarketplaceDistribution;

      let result: Awaited<
        ReturnType<ListMarketplaceDistributionsUseCase['execute']>
      >;

      beforeEach(async () => {
        mockMarketplaceDistributionRepository.findByMarketplaceId.mockResolvedValue(
          [pendingMerge],
        );
        result = await useCase.execute({
          userId,
          organizationId,
          marketplaceId,
        });
      });

      it('falls back to null', () => {
        expect(result[0].lastPublishedOnMainAt).toBeNull();
      });
    });

    describe('when the latest row is pending_merge over a prior success', () => {
      const confirmedAt = new Date('2026-06-01T10:00:00.000Z');
      const priorSuccess = {
        ...distributionA,
        id: createMarketplaceDistributionId(uuidv4()),
        publishConfirmedAt: confirmedAt,
      } as MarketplaceDistribution;
      const latestPendingMerge = {
        id: createMarketplaceDistributionId(uuidv4()),
        organizationId,
        marketplaceId,
        packageId,
        pluginSlug: 'my-plugin',
        authorId: userId,
        status: DistributionStatus.pending_merge,
        source: 'app',
      } as unknown as MarketplaceDistribution;

      let result: Awaited<
        ReturnType<ListMarketplaceDistributionsUseCase['execute']>
      >;

      beforeEach(async () => {
        // Repository contract: rows ordered DESC by createdAt — the new
        // pending_merge row comes first, the older success row second.
        mockMarketplaceDistributionRepository.findByMarketplaceId.mockResolvedValue(
          [latestPendingMerge, priorSuccess],
        );
        result = await useCase.execute({
          userId,
          organizationId,
          marketplaceId,
        });
      });

      it('keeps the latest pending_merge row as the visible distribution', () => {
        expect(result[0].id).toEqual(latestPendingMerge.id);
      });

      it("surfaces the prior success's publishConfirmedAt on the row", () => {
        expect(result[0].lastPublishedOnMainAt).toEqual(confirmedAt);
      });
    });
  });

  describe('when a distribution has been removed', () => {
    let result: Awaited<
      ReturnType<ListMarketplaceDistributionsUseCase['execute']>
    >;

    beforeEach(async () => {
      mockMarketplaceDistributionRepository.findByMarketplaceId.mockResolvedValue(
        [distributionA, removedDistribution],
      );
      result = await useCase.execute({
        userId,
        organizationId,
        marketplaceId,
      });
    });

    it('excludes the removed distribution from the list', () => {
      expect(result.map((item) => item.id)).toEqual([distributionA.id]);
    });
  });

  describe('wrong-org isolation', () => {
    beforeEach(() => {
      mockMarketplaceRepository.findByOrganizationAndId.mockResolvedValue(null);
    });

    it('throws MarketplaceNotFoundError', async () => {
      await expect(
        useCase.execute({ userId, organizationId, marketplaceId }),
      ).rejects.toBeInstanceOf(MarketplaceNotFoundError);
    });

    it('does not load any distribution', async () => {
      await useCase
        .execute({ userId, organizationId, marketplaceId })
        .catch(() => {
          /* expected */
        });
      expect(
        mockMarketplaceDistributionRepository.findByMarketplaceId,
      ).not.toHaveBeenCalled();
    });
  });

  describe('empty marketplace', () => {
    beforeEach(() => {
      mockMarketplaceDistributionRepository.findByMarketplaceId.mockResolvedValue(
        [],
      );
    });

    it('returns an empty array', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        marketplaceId,
      });
      expect(result).toEqual([]);
    });

    it('does not call the package service', async () => {
      await useCase.execute({ userId, organizationId, marketplaceId });
      expect(mockPackageService.findById).not.toHaveBeenCalled();
    });
  });

  describe('when the source package has been removed', () => {
    let result: Awaited<
      ReturnType<ListMarketplaceDistributionsUseCase['execute']>
    >;

    beforeEach(async () => {
      mockPackageService.findById = jest.fn().mockResolvedValue(null);
      result = await useCase.execute({
        userId,
        organizationId,
        marketplaceId,
      });
    });

    it('still returns the distribution row', () => {
      expect(result).toHaveLength(1);
    });

    it('falls back to an empty package name without throwing', () => {
      expect(result[0].packageName).toBe('');
    });

    it('falls back to a null space rather than guessing', () => {
      expect(result[0].space).toBeNull();
    });

    it('does not call the spaces port', () => {
      expect(mockSpacesPort.getSpaceById).not.toHaveBeenCalled();
    });
  });
});
