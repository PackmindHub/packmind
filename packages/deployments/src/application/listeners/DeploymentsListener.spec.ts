import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  createOrganizationId,
  createSpaceId,
  createStandardId,
  createUserId,
  StandardDeletedEvent,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { IPackageRepository } from '../../domain/repositories/IPackageRepository';
import { DeploymentsListener } from './DeploymentsListener';

describe('DeploymentsListener', () => {
  let eventService: PackmindEventEmitterService;
  let mockPackageRepository: jest.Mocked<IPackageRepository>;
  let listener: DeploymentsListener;
  let mockDataSource: DataSource;

  beforeEach(() => {
    mockDataSource = {
      isInitialized: true,
      options: {},
    } as unknown as DataSource;

    eventService = new PackmindEventEmitterService(mockDataSource);
    mockPackageRepository = {
      removeStandardFromAllPackages: jest.fn().mockResolvedValue(undefined),
      findBySpaceId: jest.fn(),
      findByOrganizationId: jest.fn(),
      findById: jest.fn(),
      findBySlugsWithArtefacts: jest.fn(),
      addRecipes: jest.fn(),
      addStandards: jest.fn(),
      updatePackageDetails: jest.fn(),
      setRecipes: jest.fn(),
      setStandards: jest.fn(),
      add: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    } as unknown as jest.Mocked<IPackageRepository>;

    listener = new DeploymentsListener(mockPackageRepository);
    listener.initialize(eventService);
  });

  afterEach(() => {
    eventService.removeAllListeners();
    jest.clearAllMocks();
  });

  describe('when StandardDeletedEvent is emitted', () => {
    const standardId = createStandardId('standard-123');
    const spaceId = createSpaceId('space-456');
    const organizationId = createOrganizationId('org-789');
    const userId = createUserId('user-abc');

    it('calls removeStandardFromAllPackages with the standardId', async () => {
      const event = new StandardDeletedEvent({
        standardId,
        spaceId,
        organizationId,
        userId,
      });

      eventService.emit(event);

      // Wait for async handler to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        mockPackageRepository.removeStandardFromAllPackages,
      ).toHaveBeenCalledWith(standardId);
    });

    it('handles multiple StandardDeletedEvents', async () => {
      const standardId2 = createStandardId('standard-456');

      eventService.emit(
        new StandardDeletedEvent({
          standardId,
          spaceId,
          organizationId,
          userId,
        }),
      );

      eventService.emit(
        new StandardDeletedEvent({
          standardId: standardId2,
          spaceId,
          organizationId,
          userId,
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        mockPackageRepository.removeStandardFromAllPackages,
      ).toHaveBeenCalledTimes(2);
      expect(
        mockPackageRepository.removeStandardFromAllPackages,
      ).toHaveBeenCalledWith(standardId);
      expect(
        mockPackageRepository.removeStandardFromAllPackages,
      ).toHaveBeenCalledWith(standardId2);
    });
  });
});
