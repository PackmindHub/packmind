import { v4 as uuidv4 } from 'uuid';
import { DataSource } from 'typeorm';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  createMarketplaceDistributionId,
  createMarketplaceId,
  createOrganizationId,
  createPackageId,
  createSpaceId,
  createUserId,
  DistributionStatus,
  MarketplaceDistribution,
  MarketplacePluginRemovalInitiatedEvent,
  Package,
  PackagesDeletedEvent,
} from '@packmind/types';
import { IMarketplaceDistributionRepository } from '../../domain/repositories/IMarketplaceDistributionRepository';
import { PackageService } from '../services/PackageService';
import { PackageDeletedDistributionsListener } from './PackageDeletedDistributionsListener';

describe('PackageDeletedDistributionsListener', () => {
  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());
  const spaceId = createSpaceId(uuidv4());
  const packageId = createPackageId(uuidv4());
  const otherPackageId = createPackageId(uuidv4());
  const marketplaceA = createMarketplaceId(uuidv4());
  const marketplaceB = createMarketplaceId(uuidv4());

  const buildSuccessDistribution = (
    overrides: Partial<MarketplaceDistribution> = {},
  ): MarketplaceDistribution =>
    ({
      id: createMarketplaceDistributionId(uuidv4()),
      organizationId,
      marketplaceId: marketplaceA,
      packageId,
      pluginSlug: 'my-plugin',
      authorId: userId,
      status: DistributionStatus.success,
      source: 'app',
      ...overrides,
    }) as unknown as MarketplaceDistribution;

  let eventService: PackmindEventEmitterService;
  let mockMarketplaceDistributionRepository: jest.Mocked<IMarketplaceDistributionRepository>;
  let mockPackageService: jest.Mocked<PackageService>;
  let mockRemovalJob: { addJob: jest.Mock };
  let listener: PackageDeletedDistributionsListener;
  let mockDataSource: DataSource;
  let emitSpy: jest.SpyInstance;

  beforeEach(() => {
    mockDataSource = {
      isInitialized: true,
      options: {},
    } as unknown as DataSource;

    eventService = new PackmindEventEmitterService(mockDataSource);

    mockMarketplaceDistributionRepository = {
      findActiveByPackageId: jest.fn().mockResolvedValue([]),
      updateStatus: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IMarketplaceDistributionRepository>;

    mockPackageService = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: packageId, slug: 'my-package' } as Package),
    } as unknown as jest.Mocked<PackageService>;

    mockRemovalJob = {
      addJob: jest.fn().mockResolvedValue('job-id'),
    };

    listener = new PackageDeletedDistributionsListener({
      marketplaceDistributionRepository: mockMarketplaceDistributionRepository,
      packageService: mockPackageService,
      removePluginFromMarketplaceJob: mockRemovalJob as never,
    });
    listener.initialize(eventService);

    emitSpy = jest.spyOn(eventService, 'emit');
  });

  afterEach(() => {
    eventService.removeAllListeners();
    jest.clearAllMocks();
  });

  const waitForHandlers = () =>
    new Promise((resolve) => setTimeout(resolve, 10));

  describe('when a single distribution exists for the deleted package', () => {
    const distribution = buildSuccessDistribution();

    beforeEach(async () => {
      mockMarketplaceDistributionRepository.findActiveByPackageId.mockResolvedValue(
        [distribution],
      );

      eventService.emit(
        new PackagesDeletedEvent({
          userId,
          organizationId,
          packageIds: [packageId],
          spaceId,
        }),
      );

      await waitForHandlers();
    });

    it('flips the distribution to to_be_removed', () => {
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).toHaveBeenCalledWith(distribution.id, {
        status: DistributionStatus.to_be_removed,
      });
    });

    it('enqueues the removal job for the cascaded distribution', () => {
      expect(mockRemovalJob.addJob).toHaveBeenCalledWith(
        expect.objectContaining({
          marketplaceDistributionId: distribution.id,
          marketplaceId: marketplaceA,
        }),
      );
    });

    describe('cascade event', () => {
      let cascadeEvents: MarketplacePluginRemovalInitiatedEvent[];

      beforeEach(() => {
        cascadeEvents = emitSpy.mock.calls
          .map(([event]) => event)
          .filter(
            (event): event is MarketplacePluginRemovalInitiatedEvent =>
              event instanceof MarketplacePluginRemovalInitiatedEvent,
          );
      });

      it('emits exactly one MarketplacePluginRemovalInitiatedEvent', () => {
        expect(cascadeEvents).toHaveLength(1);
      });

      it('uses the from_packmind_package trigger', () => {
        expect(cascadeEvents[0].payload.trigger).toBe('from_packmind_package');
      });

      it('carries the distribution id in the payload', () => {
        expect(cascadeEvents[0].payload.distributionId).toBe(distribution.id);
      });

      it('carries the marketplace id in the payload', () => {
        expect(cascadeEvents[0].payload.marketplaceId).toBe(marketplaceA);
      });
    });
  });

  describe('when multiple distributions exist across marketplaces', () => {
    const distA = buildSuccessDistribution({ marketplaceId: marketplaceA });
    const distB = buildSuccessDistribution({ marketplaceId: marketplaceB });

    beforeEach(async () => {
      mockMarketplaceDistributionRepository.findActiveByPackageId.mockResolvedValue(
        [distA, distB],
      );

      eventService.emit(
        new PackagesDeletedEvent({
          userId,
          organizationId,
          packageIds: [packageId],
          spaceId,
        }),
      );

      await waitForHandlers();
    });

    it('calls updateStatus once per distribution', () => {
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).toHaveBeenCalledTimes(2);
    });

    it('flips distribution A to to_be_removed', () => {
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).toHaveBeenCalledWith(distA.id, {
        status: DistributionStatus.to_be_removed,
      });
    });

    it('flips distribution B to to_be_removed', () => {
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).toHaveBeenCalledWith(distB.id, {
        status: DistributionStatus.to_be_removed,
      });
    });

    it('emits one event per affected distribution', () => {
      const cascadeEvents = emitSpy.mock.calls
        .map(([event]) => event)
        .filter(
          (event) => event instanceof MarketplacePluginRemovalInitiatedEvent,
        );
      expect(cascadeEvents).toHaveLength(2);
    });
  });

  describe('when no distributions exist for the deleted package', () => {
    beforeEach(async () => {
      mockMarketplaceDistributionRepository.findActiveByPackageId.mockResolvedValue(
        [],
      );

      eventService.emit(
        new PackagesDeletedEvent({
          userId,
          organizationId,
          packageIds: [packageId],
          spaceId,
        }),
      );

      await waitForHandlers();
    });

    it('does not call updateStatus', () => {
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).not.toHaveBeenCalled();
    });

    it('does not emit a removal event', () => {
      const cascadeEvents = emitSpy.mock.calls
        .map(([event]) => event)
        .filter(
          (event) => event instanceof MarketplacePluginRemovalInitiatedEvent,
        );
      expect(cascadeEvents).toHaveLength(0);
    });
  });

  describe('status filter — already to_be_removed rows are skipped', () => {
    const liveDist = buildSuccessDistribution();
    const alreadyPending = buildSuccessDistribution({
      status: DistributionStatus.to_be_removed,
    });

    beforeEach(async () => {
      // The repo would normally pre-filter; we double-up to assert the
      // listener's defensive guard.
      mockMarketplaceDistributionRepository.findActiveByPackageId.mockResolvedValue(
        [liveDist, alreadyPending],
      );

      eventService.emit(
        new PackagesDeletedEvent({
          userId,
          organizationId,
          packageIds: [packageId],
          spaceId,
        }),
      );

      await waitForHandlers();
    });

    it('calls updateStatus exactly once', () => {
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).toHaveBeenCalledTimes(1);
    });

    it('only flips the live success row to to_be_removed', () => {
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).toHaveBeenCalledWith(liveDist.id, {
        status: DistributionStatus.to_be_removed,
      });
    });
  });

  describe('when the event carries multiple package ids', () => {
    const distFromPkg1 = buildSuccessDistribution({ packageId });
    const distFromPkg2 = buildSuccessDistribution({
      packageId: otherPackageId,
      marketplaceId: marketplaceB,
    });

    beforeEach(async () => {
      mockMarketplaceDistributionRepository.findActiveByPackageId.mockImplementation(
        async (pid) =>
          pid === packageId
            ? [distFromPkg1]
            : pid === otherPackageId
              ? [distFromPkg2]
              : [],
      );

      eventService.emit(
        new PackagesDeletedEvent({
          userId,
          organizationId,
          packageIds: [packageId, otherPackageId],
          spaceId,
        }),
      );

      await waitForHandlers();
    });

    it('looks up active distributions once per package id', () => {
      expect(
        mockMarketplaceDistributionRepository.findActiveByPackageId,
      ).toHaveBeenCalledTimes(2);
    });

    it('flips one distribution per package id', () => {
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).toHaveBeenCalledTimes(2);
    });
  });
});
