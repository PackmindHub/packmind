import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';
import { PackmindEventEmitterService } from '@packmind/node-utils';
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
  MarketplacePluginRemovalInitiatedEvent,
  Organization,
  PluginDistributionInvalidStateError,
  PluginDistributionNotFoundError,
  User,
} from '@packmind/types';
import { IMarketplaceRepository } from '../../../domain/repositories/IMarketplaceRepository';
import { IMarketplaceDistributionRepository } from '../../../domain/repositories/IMarketplaceDistributionRepository';
import { PackageService } from '../../services/PackageService';
import { MarkPluginForRemovalUseCase } from './MarkPluginForRemovalUseCase';

describe('MarkPluginForRemovalUseCase', () => {
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

  const successDistribution = {
    id: distributionId,
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
  let mockEventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let mockRemovalJob: { addJob: jest.Mock };
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let useCase: MarkPluginForRemovalUseCase;

  beforeEach(() => {
    mockMarketplaceRepository = {
      findByOrganizationAndId: jest.fn().mockResolvedValue(existingMarketplace),
    } as unknown as jest.Mocked<IMarketplaceRepository>;

    mockMarketplaceDistributionRepository = {
      findById: jest.fn().mockResolvedValue(successDistribution),
      findLatestSuccessfulByPackageAndMarketplace: jest
        .fn()
        .mockResolvedValue(successDistribution),
      updateStatus: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IMarketplaceDistributionRepository>;

    mockPackageService = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: packageId, slug: 'my-package' }),
    } as unknown as jest.Mocked<PackageService>;

    mockEventEmitterService = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    mockRemovalJob = {
      addJob: jest.fn().mockResolvedValue('job-id'),
    };

    mockAccountsPort = {
      getUserById: jest.fn().mockResolvedValue(adminUser),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    useCase = new MarkPluginForRemovalUseCase(
      mockMarketplaceRepository,
      mockMarketplaceDistributionRepository,
      mockPackageService,
      mockEventEmitterService,
      mockRemovalJob as never,
      mockAccountsPort,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('admin happy path — by distributionId', () => {
    beforeEach(async () => {
      await useCase.execute({
        userId,
        organizationId,
        marketplaceId,
        distributionId,
      });
    });

    it('looks up the marketplace by org', () => {
      expect(
        mockMarketplaceRepository.findByOrganizationAndId,
      ).toHaveBeenCalledWith(organizationId, marketplaceId);
    });

    it('looks up the distribution by id', () => {
      expect(
        mockMarketplaceDistributionRepository.findById,
      ).toHaveBeenCalledWith(distributionId);
    });

    it('does not call the by-package finder', () => {
      expect(
        mockMarketplaceDistributionRepository.findLatestSuccessfulByPackageAndMarketplace,
      ).not.toHaveBeenCalled();
    });

    it('does not flip the status (the removal job owns the flip after the sync commit)', () => {
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).not.toHaveBeenCalled();
    });

    it('returns the distribution still in success state', async () => {
      const { distribution } = await useCase.execute({
        userId,
        organizationId,
        marketplaceId,
        distributionId,
      });
      expect(distribution.status).toBe(DistributionStatus.success);
    });

    it('emits one event', () => {
      expect(mockEventEmitterService.emit).toHaveBeenCalledTimes(1);
    });

    it('emits a MarketplacePluginRemovalInitiatedEvent', () => {
      const emitted = mockEventEmitterService.emit.mock.calls[0][0];
      expect(emitted).toBeInstanceOf(MarketplacePluginRemovalInitiatedEvent);
    });

    it('emits with trigger="from_marketplace"', () => {
      const emitted = mockEventEmitterService.emit.mock.calls[0][0];
      expect(emitted.payload.trigger).toBe('from_marketplace');
    });

    it('emits the package slug fetched from the package service', () => {
      const emitted = mockEventEmitterService.emit.mock.calls[0][0];
      expect(emitted.payload.packageSlug).toBe('my-package');
    });

    it('enqueues the removal job for the distribution', () => {
      expect(mockRemovalJob.addJob).toHaveBeenCalledWith(
        expect.objectContaining({
          marketplaceDistributionId: distributionId,
          marketplaceId,
        }),
      );
    });
  });

  describe('admin happy path — by packageId', () => {
    beforeEach(async () => {
      await useCase.execute({
        userId,
        organizationId,
        marketplaceId,
        packageId,
      });
    });

    it('looks up the latest successful distribution by (package, marketplace)', () => {
      expect(
        mockMarketplaceDistributionRepository.findLatestSuccessfulByPackageAndMarketplace,
      ).toHaveBeenCalledWith(packageId, marketplaceId);
    });

    it('does not call findById', () => {
      expect(
        mockMarketplaceDistributionRepository.findById,
      ).not.toHaveBeenCalled();
    });

    it('does not flip the status (the removal job owns the flip after the sync commit)', () => {
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).not.toHaveBeenCalled();
    });

    it('emits with trigger="from_marketplace"', () => {
      const emitted = mockEventEmitterService.emit.mock.calls[0][0];
      expect(emitted.payload.trigger).toBe('from_marketplace');
    });
  });

  describe('idempotency — already to_be_removed', () => {
    beforeEach(() => {
      mockMarketplaceDistributionRepository.findById.mockResolvedValue({
        ...successDistribution,
        status: DistributionStatus.to_be_removed,
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

    it('does not emit any event', async () => {
      await useCase
        .execute({ userId, organizationId, marketplaceId, distributionId })
        .catch(() => {
          /* expected */
        });
      expect(mockEventEmitterService.emit).not.toHaveBeenCalled();
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

  describe('no success distribution exists for the package', () => {
    beforeEach(() => {
      mockMarketplaceDistributionRepository.findLatestSuccessfulByPackageAndMarketplace.mockResolvedValue(
        null,
      );
    });

    it('throws PluginDistributionNotFoundError', async () => {
      await expect(
        useCase.execute({
          userId,
          organizationId,
          marketplaceId,
          packageId,
        }),
      ).rejects.toBeInstanceOf(PluginDistributionNotFoundError);
    });

    it('does not emit any event', async () => {
      await useCase
        .execute({ userId, organizationId, marketplaceId, packageId })
        .catch(() => {
          /* expected */
        });
      expect(mockEventEmitterService.emit).not.toHaveBeenCalled();
    });
  });

  describe('distribution belongs to a different marketplace', () => {
    beforeEach(() => {
      mockMarketplaceDistributionRepository.findById.mockResolvedValue({
        ...successDistribution,
        marketplaceId: createMarketplaceId(uuidv4()),
      } as MarketplaceDistribution);
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

    describe('after the rejected execution', () => {
      beforeEach(async () => {
        await useCase
          .execute({ userId, organizationId, marketplaceId, distributionId })
          .catch(() => {
            /* expected */
          });
      });

      it('does not update any distribution status', () => {
        expect(
          mockMarketplaceDistributionRepository.updateStatus,
        ).not.toHaveBeenCalled();
      });

      it('does not emit any cascade event', () => {
        expect(mockEventEmitterService.emit).not.toHaveBeenCalled();
      });
    });
  });
});
