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
  Marketplace,
  MarketplaceDistribution,
  MarketplaceNotFoundError,
  Organization,
  Package,
  User,
} from '@packmind/types';
import { IMarketplaceRepository } from '../../../domain/repositories/IMarketplaceRepository';
import { IMarketplaceDistributionRepository } from '../../../domain/repositories/IMarketplaceDistributionRepository';
import { PackageService } from '../../services/PackageService';
import { ListMarketplaceDistributionsUseCase } from './listMarketplaceDistributions.usecase';

describe('ListMarketplaceDistributionsUseCase', () => {
  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());
  const marketplaceId = createMarketplaceId(uuidv4());
  const packageId = createPackageId(uuidv4());

  const existingMarketplace = {
    id: marketplaceId,
    organizationId,
    name: 'ACME Plugins',
  } as unknown as Marketplace;

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

  let mockMarketplaceRepository: jest.Mocked<IMarketplaceRepository>;
  let mockMarketplaceDistributionRepository: jest.Mocked<IMarketplaceDistributionRepository>;
  let mockPackageService: jest.Mocked<PackageService>;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
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
      } as Package),
    } as unknown as jest.Mocked<PackageService>;

    mockAccountsPort = {
      getUserById: jest.fn().mockResolvedValue(memberUser),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    useCase = new ListMarketplaceDistributionsUseCase(
      mockMarketplaceRepository,
      mockMarketplaceDistributionRepository,
      mockPackageService,
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

  describe('missing package gracefully falls back to empty name', () => {
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
  });
});
