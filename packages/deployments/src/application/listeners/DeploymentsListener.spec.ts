import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  createOrganizationId,
  createCommandId,
  createSkillId,
  createSpaceId,
  createStandardId,
  createUserId,
  CommandDeletedEvent,
  SkillDeletedEvent,
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
      removeCommandFromAllPackages: jest.fn().mockResolvedValue(undefined),
      removeSkillFromAllPackages: jest.fn().mockResolvedValue(undefined),
      removeStandardFromAllPackages: jest.fn().mockResolvedValue(undefined),
      findBySpaceId: jest.fn(),
      findByOrganizationId: jest.fn(),
      findById: jest.fn(),
      findBySlugsWithArtefacts: jest.fn(),
      addCommands: jest.fn(),
      addStandards: jest.fn(),
      updatePackageDetails: jest.fn(),
      setCommands: jest.fn(),
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
    const recipeId = createCommandId('recipe-123');

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
        mockPackageRepository.removeCommandFromAllPackages,
      ).toHaveBeenCalledWith(recipeId);
    });

    describe('when multiple RecipeDeletedEvents are emitted', () => {
      const commandId2 = createCommandId('recipe-456');

      beforeEach(async () => {
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
            id: commandId2,
            spaceId,
            organizationId,
            userId,
          }),
        );

        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      it('calls removeRecipeFromAllPackages twice', async () => {
        expect(
          mockPackageRepository.removeCommandFromAllPackages,
        ).toHaveBeenCalledTimes(2);
      });

      it('calls removeRecipeFromAllPackages with the first recipeId', async () => {
        expect(
          mockPackageRepository.removeCommandFromAllPackages,
        ).toHaveBeenCalledWith(recipeId);
      });

      it('calls removeRecipeFromAllPackages with the second recipeId', async () => {
        expect(
          mockPackageRepository.removeCommandFromAllPackages,
        ).toHaveBeenCalledWith(commandId2);
      });
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

    describe('when multiple StandardDeletedEvents are emitted', () => {
      const standardId2 = createStandardId('standard-456');

      beforeEach(async () => {
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
      });

      it('calls removeStandardFromAllPackages twice', async () => {
        expect(
          mockPackageRepository.removeStandardFromAllPackages,
        ).toHaveBeenCalledTimes(2);
      });

      it('calls removeStandardFromAllPackages with the first standardId', async () => {
        expect(
          mockPackageRepository.removeStandardFromAllPackages,
        ).toHaveBeenCalledWith(standardId);
      });

      it('calls removeStandardFromAllPackages with the second standardId', async () => {
        expect(
          mockPackageRepository.removeStandardFromAllPackages,
        ).toHaveBeenCalledWith(standardId2);
      });
    });
  });

  describe('when SkillDeletedEvent is emitted', () => {
    const skillId = createSkillId('skill-123');

    it('calls removeSkillFromAllPackages with the skillId', async () => {
      const event = new SkillDeletedEvent({
        skillId,
        spaceId,
        organizationId,
        userId,
      });

      eventService.emit(event);

      // Wait for async handler to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        mockPackageRepository.removeSkillFromAllPackages,
      ).toHaveBeenCalledWith(skillId);
    });

    describe('when multiple SkillDeletedEvents are emitted', () => {
      const skillId2 = createSkillId('skill-456');

      beforeEach(async () => {
        eventService.emit(
          new SkillDeletedEvent({
            skillId,
            spaceId,
            organizationId,
            userId,
          }),
        );

        eventService.emit(
          new SkillDeletedEvent({
            skillId: skillId2,
            spaceId,
            organizationId,
            userId,
          }),
        );

        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      it('calls removeSkillFromAllPackages twice', async () => {
        expect(
          mockPackageRepository.removeSkillFromAllPackages,
        ).toHaveBeenCalledTimes(2);
      });

      it('calls removeSkillFromAllPackages with the first skillId', async () => {
        expect(
          mockPackageRepository.removeSkillFromAllPackages,
        ).toHaveBeenCalledWith(skillId);
      });

      it('calls removeSkillFromAllPackages with the second skillId', async () => {
        expect(
          mockPackageRepository.removeSkillFromAllPackages,
        ).toHaveBeenCalledWith(skillId2);
      });
    });
  });
});
