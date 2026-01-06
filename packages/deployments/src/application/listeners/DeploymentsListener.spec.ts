import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  createOrganizationId,
  createRecipeId,
  createSpaceId,
  createStandardId,
  createUserId,
  CommandDeletedEvent,
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

  const spaceId = createSpaceId('space-456');
  const organizationId = createOrganizationId('org-789');
  const userId = createUserId('user-abc');

  beforeEach(() => {
    mockDataSource = {
      isInitialized: true,
      options: {},
    } as unknown as DataSource;

    eventService = new PackmindEventEmitterService(mockDataSource);
    mockPackageRepository = {
      removeRecipeFromAllPackages: jest.fn().mockResolvedValue(undefined),
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

  describe('when RecipeDeletedEvent is emitted', () => {
    const recipeId = createRecipeId('recipe-123');

    it('calls removeRecipeFromAllPackages with the recipeId', async () => {
      const event = new CommandDeletedEvent({
        id: recipeId,
        spaceId,
        organizationId,
        userId,
      });

      eventService.emit(event);

      // Wait for async handler to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        mockPackageRepository.removeRecipeFromAllPackages,
      ).toHaveBeenCalledWith(recipeId);
    });

    it('handles multiple RecipeDeletedEvents', async () => {
      const recipeId2 = createRecipeId('recipe-456');

      eventService.emit(
        new CommandDeletedEvent({
          id: recipeId,
          spaceId,
          organizationId,
          userId,
        }),
      );

      eventService.emit(
        new CommandDeletedEvent({
          id: recipeId2,
          spaceId,
          organizationId,
          userId,
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        mockPackageRepository.removeRecipeFromAllPackages,
      ).toHaveBeenCalledTimes(2);
      expect(
        mockPackageRepository.removeRecipeFromAllPackages,
      ).toHaveBeenCalledWith(recipeId);
      expect(
        mockPackageRepository.removeRecipeFromAllPackages,
      ).toHaveBeenCalledWith(recipeId2);
    });
  });

  describe('when StandardDeletedEvent is emitted', () => {
    const standardId = createStandardId('standard-123');

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
