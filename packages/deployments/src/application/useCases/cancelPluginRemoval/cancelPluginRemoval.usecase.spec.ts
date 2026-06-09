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
  PluginDistributionInvalidStateError,
  PluginDistributionNotFoundError,
  User,
} from '@packmind/types';
import { IMarketplaceRepository } from '../../../domain/repositories/IMarketplaceRepository';
import { IMarketplaceDistributionRepository } from '../../../domain/repositories/IMarketplaceDistributionRepository';
import { CancelPluginRemovalUseCase } from './cancelPluginRemoval.usecase';

describe('CancelPluginRemovalUseCase', () => {
  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());
  const marketplaceId = createMarketplaceId(uuidv4());
  const distributionId = createMarketplaceDistributionId(uuidv4());
  const packageId = createPackageId(uuidv4());

  const existingMarketplace = {
    id: marketplaceId,
    organizationId,
    name: 'ACME Plugins',
  } as unknown as Marketplace;

  const adminUser = {
    id: userId,
    email: 'admin@example.com',
    displayName: 'Admin User',
    passwordHash: null,
    active: true,
    memberships: [{ userId, organizationId, role: 'admin' as const }],
    trial: false,
  } as unknown as User;

  const memberUser = {
    ...adminUser,
    memberships: [{ userId, organizationId, role: 'member' as const }],
  } as unknown as User;

  const organization: Organization = {
    id: organizationId,
    name: 'Test Org',
    slug: 'test-org',
  };

  const pendingDistribution = {
    id: distributionId,
    organizationId,
    marketplaceId,
    packageId,
    pluginSlug: 'my-plugin',
    authorId: userId,
    status: DistributionStatus.to_be_removed,
    source: 'app',
  } as unknown as MarketplaceDistribution;

  let mockMarketplaceRepository: jest.Mocked<IMarketplaceRepository>;
  let mockMarketplaceDistributionRepository: jest.Mocked<IMarketplaceDistributionRepository>;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let useCase: CancelPluginRemovalUseCase;

  beforeEach(() => {
    mockMarketplaceRepository = {
      findByOrganizationAndId: jest.fn().mockResolvedValue(existingMarketplace),
    } as unknown as jest.Mocked<IMarketplaceRepository>;

    mockMarketplaceDistributionRepository = {
      findById: jest.fn().mockResolvedValue(pendingDistribution),
      updateStatus: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IMarketplaceDistributionRepository>;

    mockAccountsPort = {
      getUserById: jest.fn().mockResolvedValue(adminUser),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    useCase = new CancelPluginRemovalUseCase(
      mockMarketplaceRepository,
      mockMarketplaceDistributionRepository,
      mockAccountsPort,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('admin happy path', () => {
    let response: Awaited<ReturnType<CancelPluginRemovalUseCase['execute']>>;

    beforeEach(async () => {
      response = await useCase.execute({
        userId,
        organizationId,
        marketplaceId,
        distributionId,
      });
    });

    it('reverts status to success', () => {
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).toHaveBeenCalledWith(distributionId, {
        status: DistributionStatus.success,
      });
    });

    it('returns the distribution under its original id', () => {
      expect(response.distribution.id).toEqual(distributionId);
    });

    it('returns the distribution with status restored to success', () => {
      expect(response.distribution.status).toBe(DistributionStatus.success);
    });
  });

  describe('non-to_be_removed state', () => {
    beforeEach(() => {
      mockMarketplaceDistributionRepository.findById.mockResolvedValue({
        ...pendingDistribution,
        status: DistributionStatus.success,
      } as MarketplaceDistribution);
    });

    it('throws PluginDistributionInvalidStateError', async () => {
      await expect(
        useCase.execute({
          userId,
          organizationId,
          marketplaceId,
          distributionId,
        }),
      ).rejects.toBeInstanceOf(PluginDistributionInvalidStateError);
    });

    it('does not write the status', async () => {
      await useCase
        .execute({ userId, organizationId, marketplaceId, distributionId })
        .catch(() => {
          /* expected */
        });
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).not.toHaveBeenCalled();
    });
  });

  describe('marketplace not found', () => {
    beforeEach(() => {
      mockMarketplaceRepository.findByOrganizationAndId.mockResolvedValue(null);
    });

    it('throws MarketplaceNotFoundError', async () => {
      await expect(
        useCase.execute({
          userId,
          organizationId,
          marketplaceId,
          distributionId,
        }),
      ).rejects.toBeInstanceOf(MarketplaceNotFoundError);
    });
  });

  describe('distribution not found or wrong marketplace', () => {
    beforeEach(() => {
      mockMarketplaceDistributionRepository.findById.mockResolvedValue(null);
    });

    it('throws PluginDistributionNotFoundError', async () => {
      await expect(
        useCase.execute({
          userId,
          organizationId,
          marketplaceId,
          distributionId,
        }),
      ).rejects.toBeInstanceOf(PluginDistributionNotFoundError);
    });
  });

  describe('non-admin denial', () => {
    beforeEach(() => {
      mockAccountsPort.getUserById = jest.fn().mockResolvedValue(memberUser);
    });

    it('throws OrganizationAdminRequiredError', async () => {
      await expect(
        useCase.execute({
          userId,
          organizationId,
          marketplaceId,
          distributionId,
        }),
      ).rejects.toMatchObject({ name: 'OrganizationAdminRequiredError' });
    });

    it('does not mutate state', async () => {
      await useCase
        .execute({ userId, organizationId, marketplaceId, distributionId })
        .catch(() => {
          /* expected */
        });
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).not.toHaveBeenCalled();
    });
  });
});
