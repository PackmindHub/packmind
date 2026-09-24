import { createMockInstance, mockInterface } from '@packmind/test-utils';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  createOrganizationId,
  createCommandId,
  createSkillId,
  createSpaceId,
  createStandardId,
  createUserId,
  CommandCreatedEvent,
  CommandDeletedEvent,
  CommandUpdatedEvent,
  SkillCreatedEvent,
  SkillDeletedEvent,
  SkillUpdatedEvent,
  StandardCreatedEvent,
  StandardDeletedEvent,
  StandardUpdatedEvent,
  PackmindEventSource,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { IPackageRepository } from '../../domain/repositories/IPackageRepository';
import { SpaceContentNotifier } from '../services/SpaceContentNotifier';
import { DeploymentsListener } from './DeploymentsListener';

describe('DeploymentsListener', () => {
  let eventService: PackmindEventEmitterService;
  let mockPackageRepository: jest.Mocked<IPackageRepository>;
  let listener: DeploymentsListener;
  let mockSpaceContentNotifier: jest.Mocked<SpaceContentNotifier>;
  let mockDataSource: DataSource;

  const spaceId = createSpaceId('space-456');
  const organizationId = createOrganizationId('org-789');
  const userId = createUserId('user-abc');
  const source: PackmindEventSource = 'ui';

  beforeEach(() => {
    mockDataSource = {
      isInitialized: true,
      options: {},
    } as unknown as DataSource;

    eventService = new PackmindEventEmitterService(mockDataSource);
    mockPackageRepository = mockInterface<IPackageRepository>();
    mockPackageRepository.removeCommandFromAllPackages.mockResolvedValue(
      undefined,
    );
    mockPackageRepository.removeSkillFromAllPackages.mockResolvedValue(
      undefined,
    );
    mockPackageRepository.removeStandardFromAllPackages.mockResolvedValue(
      undefined,
    );

    mockSpaceContentNotifier = createMockInstance(SpaceContentNotifier);

    listener = new DeploymentsListener(
      mockPackageRepository,
      mockSpaceContentNotifier,
    );
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
        source,
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
            source,
          }),
        );

        eventService.emit(
          new CommandDeletedEvent({
            id: commandId2,
            spaceId,
            organizationId,
            userId,
            source,
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
        source,
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
            source,
          }),
        );

        eventService.emit(
          new StandardDeletedEvent({
            standardId: standardId2,
            spaceId,
            organizationId,
            userId,
            source,
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
        source,
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
            source,
          }),
        );

        eventService.emit(
          new SkillDeletedEvent({
            skillId: skillId2,
            spaceId,
            organizationId,
            userId,
            source,
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

  describe('when an artefact is deleted out of every package holding it', () => {
    const settle = () => new Promise((resolve) => setTimeout(resolve, 10));

    describe('when a skill is deleted', () => {
      beforeEach(async () => {
        eventService.emit(
          new SkillDeletedEvent({
            skillId: createSkillId('skill-123'),
            spaceId,
            organizationId,
            userId,
            source,
          }),
        );
        await settle();
      });

      it('tells the space it moved on', () => {
        expect(
          mockSpaceContentNotifier.spaceContentChanged,
        ).toHaveBeenCalledWith(organizationId, spaceId);
      });
    });

    describe('when a command is deleted', () => {
      beforeEach(async () => {
        eventService.emit(
          new CommandDeletedEvent({
            id: createCommandId('recipe-123'),
            spaceId,
            organizationId,
            userId,
            source,
          }),
        );
        await settle();
      });

      it('tells the space it moved on', () => {
        expect(
          mockSpaceContentNotifier.spaceContentChanged,
        ).toHaveBeenCalledWith(organizationId, spaceId);
      });
    });

    describe('when a standard is deleted', () => {
      beforeEach(async () => {
        eventService.emit(
          new StandardDeletedEvent({
            standardId: createStandardId('standard-123'),
            spaceId,
            organizationId,
            userId,
            source,
          }),
        );
        await settle();
      });

      it('tells the space it moved on', () => {
        expect(
          mockSpaceContentNotifier.spaceContentChanged,
        ).toHaveBeenCalledWith(organizationId, spaceId);
      });
    });
  });

  /*
   * A component's life outside packages still moves a package surface: the rows
   * are drawn by resolving the package's ids against the space catalogue, so a
   * catalogue that changed under a package list that did not is a count with no
   * row beneath it.
   */
  describe('when a component is created or edited elsewhere in the space', () => {
    const settle = () => new Promise((resolve) => setTimeout(resolve, 10));
    const shared = { spaceId, organizationId, userId, source };

    describe.each([
      [
        'a standard is created',
        () =>
          new StandardCreatedEvent({
            ...shared,
            standardId: createStandardId('standard-1'),
            method: 'blank' as const,
          }),
      ],
      [
        'a standard is edited',
        () =>
          new StandardUpdatedEvent({
            ...shared,
            standardId: createStandardId('standard-1'),
            newVersion: 2,
          }),
      ],
      [
        'a command is created',
        () =>
          new CommandCreatedEvent({
            ...shared,
            id: createCommandId('recipe-1'),
          }),
      ],
      [
        'a command is edited',
        () =>
          new CommandUpdatedEvent({
            ...shared,
            id: createCommandId('recipe-1'),
            newVersion: 2,
          }),
      ],
      [
        'a skill is created',
        () =>
          new SkillCreatedEvent({
            ...shared,
            skillId: createSkillId('skill-1'),
            fileCount: 1,
          }),
      ],
      [
        'a skill is edited',
        () =>
          new SkillUpdatedEvent({
            ...shared,
            skillId: createSkillId('skill-1'),
            fileCount: 1,
          }),
      ],
    ])('when %s', (_label, buildEvent) => {
      beforeEach(async () => {
        eventService.emit(buildEvent());
        await settle();
      });

      it('tells the space it moved on', () => {
        expect(
          mockSpaceContentNotifier.spaceContentChanged,
        ).toHaveBeenCalledWith(organizationId, spaceId);
      });
    });
  });
});
