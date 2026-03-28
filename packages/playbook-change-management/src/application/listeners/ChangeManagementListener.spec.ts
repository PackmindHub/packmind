import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import { DataSource } from 'typeorm';
import { ChangeManagementListener } from './ChangeManagementListener';
import { ChangeProposalService } from '../services/ChangeProposalService';
import { PlaybookChangeManagementAdapter } from '../adapters/PlaybookChangeManagementAdapter';
import {
  CommandDeletedEvent,
  StandardDeletedEvent,
  SkillDeletedEvent,
  ArtefactRemovedFromPackageEvent,
  PlaybookArtefactMovedEvent,
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
  let mockAdapter: jest.Mocked<PlaybookChangeManagementAdapter>;
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

    mockAdapter = {
      migrateChangeProposalsForMovedArtefact: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<PlaybookChangeManagementAdapter>;

    listener = new ChangeManagementListener(
      mockChangeProposalService,
      mockAdapter,
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

  describe('when PlaybookArtefactMovedEvent is emitted followed by a delete event for the same artifact', () => {
    const destinationSpaceId = createSpaceId('dest-space');
    const standardId = createStandardId('standard-moved');

    it('skips cancellation for the delete event while migration is in progress', async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      let resolveMigration: () => void = () => {};
      const migrationPromise = new Promise<void>((resolve) => {
        resolveMigration = resolve;
      });
      mockAdapter.migrateChangeProposalsForMovedArtefact.mockReturnValue(
        migrationPromise,
      );

      const movedEvent = new PlaybookArtefactMovedEvent({
        artifactType: 'standard',
        oldArtifactId: standardId,
        newArtifactId: 'new-standard-id',
        sourceSpaceId: spaceId,
        destinationSpaceId,
        userId,
        organizationId,
        source: 'ui',
      });

      const deletedEvent = new StandardDeletedEvent({
        standardId,
        spaceId,
        organizationId,
        userId,
        source: 'ui',
      });

      // Both events emitted synchronously — move first, then delete
      eventService.emit(movedEvent);
      eventService.emit(deletedEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        mockChangeProposalService.cancelPendingByArtefactId,
      ).not.toHaveBeenCalled();

      resolveMigration();
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  });

  describe('when PlaybookArtefactMovedEvent is emitted', () => {
    const destinationSpaceId = createSpaceId('dest-space');

    it('calls migrateChangeProposalsForMovedArtefact with correct command', async () => {
      const event = new PlaybookArtefactMovedEvent({
        artifactType: 'standard',
        oldArtifactId: 'old-standard-id',
        newArtifactId: 'new-standard-id',
        sourceSpaceId: spaceId,
        destinationSpaceId,
        userId,
        organizationId,
        source: 'ui',
      });

      eventService.emit(event);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        mockAdapter.migrateChangeProposalsForMovedArtefact,
      ).toHaveBeenCalledWith({
        userId,
        organizationId,
        source: 'ui',
        sourceSpaceId: spaceId,
        destinationSpaceId,
        oldArtefactId: 'old-standard-id',
        newArtefactId: 'new-standard-id',
      });
    });

    describe('when migrateChangeProposalsForMovedArtefact throws', () => {
      it('does not propagate the error', async () => {
        mockAdapter.migrateChangeProposalsForMovedArtefact.mockRejectedValueOnce(
          new Error('DB error'),
        );

        const event = new PlaybookArtefactMovedEvent({
          artifactType: 'standard',
          oldArtifactId: 'old-standard-id',
          newArtifactId: 'new-standard-id',
          sourceSpaceId: spaceId,
          destinationSpaceId,
          userId,
          organizationId,
          source: 'ui',
        });

        await expect(async () => {
          eventService.emit(event);
          await new Promise((resolve) => setTimeout(resolve, 10));
        }).not.toThrow();
      });
    });
  });
});
