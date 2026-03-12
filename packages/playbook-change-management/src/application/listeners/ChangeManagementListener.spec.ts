import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import { DataSource } from 'typeorm';
import { ChangeManagementListener } from './ChangeManagementListener';
import { ChangeProposalService } from '../services/ChangeProposalService';
import {
  CommandDeletedEvent,
  StandardDeletedEvent,
  SkillDeletedEvent,
  ArtefactRemovedFromPackageEvent,
  createSpaceId,
  createOrganizationId,
  createUserId,
  createRecipeId,
  createStandardId,
  createSkillId,
  createPackageId,
} from '@packmind/types';

describe('ChangeManagementListener', () => {
  let eventService: PackmindEventEmitterService;
  let mockChangeProposalService: jest.Mocked<ChangeProposalService>;
  let listener: ChangeManagementListener;
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

    mockChangeProposalService = {
      cancelPendingByArtefactId: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ChangeProposalService>;

    listener = new ChangeManagementListener(
      mockChangeProposalService,
      stubLogger(),
    );
    listener.initialize(eventService);
  });

  afterEach(() => {
    eventService.removeAllListeners();
    jest.clearAllMocks();
  });

  describe('when CommandDeletedEvent is emitted', () => {
    const recipeId = createRecipeId('recipe-123');

    it('calls cancelPendingByArtefactId with the recipeId', async () => {
      const event = new CommandDeletedEvent({
        id: recipeId,
        spaceId,
        organizationId,
        userId,
        source: 'api',
      });

      eventService.emit(event);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        mockChangeProposalService.cancelPendingByArtefactId,
      ).toHaveBeenCalledWith(spaceId, recipeId, userId);
    });

    describe('when cancelPendingByArtefactId throws', () => {
      it('does not propagate the error', async () => {
        mockChangeProposalService.cancelPendingByArtefactId.mockRejectedValueOnce(
          new Error('DB error'),
        );

        const event = new CommandDeletedEvent({
          id: recipeId,
          spaceId,
          organizationId,
          userId,
          source: 'api',
        });

        await expect(async () => {
          eventService.emit(event);
          await new Promise((resolve) => setTimeout(resolve, 10));
        }).not.toThrow();
      });
    });
  });

  describe('when StandardDeletedEvent is emitted', () => {
    const standardId = createStandardId('standard-123');

    it('calls cancelPendingByArtefactId with the standardId', async () => {
      const event = new StandardDeletedEvent({
        standardId,
        spaceId,
        organizationId,
        userId,
        source: 'api',
      });

      eventService.emit(event);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        mockChangeProposalService.cancelPendingByArtefactId,
      ).toHaveBeenCalledWith(spaceId, standardId, userId);
    });
  });

  describe('when SkillDeletedEvent is emitted', () => {
    const skillId = createSkillId('skill-123');

    it('calls cancelPendingByArtefactId with the skillId', async () => {
      const event = new SkillDeletedEvent({
        skillId,
        spaceId,
        organizationId,
        userId,
        source: 'api',
      });

      eventService.emit(event);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        mockChangeProposalService.cancelPendingByArtefactId,
      ).toHaveBeenCalledWith(spaceId, skillId, userId);
    });
  });

  describe('when ArtefactRemovedFromPackageEvent is emitted', () => {
    const packageId = createPackageId('pkg-1');
    const artefactId = 'some-artefact-id';

    describe('when remainingPackagesCount is 0', () => {
      it('calls cancelPendingByArtefactId', async () => {
        const event = new ArtefactRemovedFromPackageEvent({
          artefactId,
          spaceId,
          packageId,
          remainingPackagesCount: 0,
          userId,
          organizationId,
          source: 'api',
        });

        eventService.emit(event);

        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(
          mockChangeProposalService.cancelPendingByArtefactId,
        ).toHaveBeenCalledWith(spaceId, artefactId, userId);
      });
    });

    describe('when remainingPackagesCount is greater than 0', () => {
      it('does NOT call cancelPendingByArtefactId', async () => {
        const event = new ArtefactRemovedFromPackageEvent({
          artefactId,
          spaceId,
          packageId,
          remainingPackagesCount: 2,
          userId,
          organizationId,
          source: 'api',
        });

        eventService.emit(event);

        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(
          mockChangeProposalService.cancelPendingByArtefactId,
        ).not.toHaveBeenCalled();
      });
    });

    describe('when cancelPendingByArtefactId throws', () => {
      it('does not propagate the error', async () => {
        mockChangeProposalService.cancelPendingByArtefactId.mockRejectedValueOnce(
          new Error('DB error'),
        );

        const event = new ArtefactRemovedFromPackageEvent({
          artefactId,
          spaceId,
          packageId,
          remainingPackagesCount: 0,
          userId,
          organizationId,
          source: 'api',
        });

        await expect(async () => {
          eventService.emit(event);
          await new Promise((resolve) => setTimeout(resolve, 10));
        }).not.toThrow();
      });
    });
  });
});
