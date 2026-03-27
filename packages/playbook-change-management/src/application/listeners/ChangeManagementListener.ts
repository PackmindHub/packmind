import { PackmindLogger } from '@packmind/logger';
import { PackmindListener } from '@packmind/node-utils';
import {
  ArtefactRemovedFromPackageEvent,
  CommandDeletedEvent,
  PlaybookArtefactMovedEvent,
  SkillDeletedEvent,
  StandardDeletedEvent,
} from '@packmind/types';
import { PlaybookChangeManagementAdapter } from '../adapters/PlaybookChangeManagementAdapter';
import { ChangeProposalService } from '../services/ChangeProposalService';

const origin = 'ChangeManagementListener';

export class ChangeManagementListener extends PackmindListener<ChangeProposalService> {
  constructor(
    adapter: ChangeProposalService,
    private readonly changeManagementAdapter: PlaybookChangeManagementAdapter,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(adapter);
  }

  protected registerHandlers(): void {
    this.subscribe(CommandDeletedEvent, this.handleCommandDeleted);
    this.subscribe(StandardDeletedEvent, this.handleStandardDeleted);
    this.subscribe(SkillDeletedEvent, this.handleSkillDeleted);
    this.subscribe(
      ArtefactRemovedFromPackageEvent,
      this.handleArtefactRemovedFromPackage,
    );
    this.subscribe(
      PlaybookArtefactMovedEvent,
      this.handlePlaybookArtefactMoved,
    );
  }

  private handleCommandDeleted = async (
    event: CommandDeletedEvent,
  ): Promise<void> => {
    const { id: recipeId, spaceId, userId } = event.payload;
    this.logger.info(
      'Handling CommandDeletedEvent — cancelling pending proposals',
      { recipeId, spaceId },
    );

    try {
      await this.adapter.cancelPendingByArtefactId(spaceId, recipeId, userId);
      this.logger.info('Cancelled pending proposals for deleted command', {
        recipeId,
        spaceId,
      });
    } catch (error) {
      this.logger.error(
        'Failed to cancel pending proposals for deleted command',
        {
          recipeId,
          spaceId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  };

  private handleStandardDeleted = async (
    event: StandardDeletedEvent,
  ): Promise<void> => {
    const { standardId, spaceId, userId } = event.payload;
    this.logger.info(
      'Handling StandardDeletedEvent — cancelling pending proposals',
      { standardId, spaceId },
    );

    try {
      await this.adapter.cancelPendingByArtefactId(spaceId, standardId, userId);
      this.logger.info('Cancelled pending proposals for deleted standard', {
        standardId,
        spaceId,
      });
    } catch (error) {
      this.logger.error(
        'Failed to cancel pending proposals for deleted standard',
        {
          standardId,
          spaceId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  };

  private handleSkillDeleted = async (
    event: SkillDeletedEvent,
  ): Promise<void> => {
    const { skillId, spaceId, userId } = event.payload;
    this.logger.info(
      'Handling SkillDeletedEvent — cancelling pending proposals',
      { skillId, spaceId },
    );

    try {
      await this.adapter.cancelPendingByArtefactId(spaceId, skillId, userId);
      this.logger.info('Cancelled pending proposals for deleted skill', {
        skillId,
        spaceId,
      });
    } catch (error) {
      this.logger.error(
        'Failed to cancel pending proposals for deleted skill',
        {
          skillId,
          spaceId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  };

  private handleArtefactRemovedFromPackage = async (
    event: ArtefactRemovedFromPackageEvent,
  ): Promise<void> => {
    const { artefactId, spaceId, userId, remainingPackagesCount } =
      event.payload;

    if (remainingPackagesCount > 0) {
      return;
    }

    try {
      await this.adapter.cancelPendingByArtefactId(spaceId, artefactId, userId);
      this.logger.info(
        'Cancelled pending proposals for artefact removed from last package',
        {
          artefactId,
          spaceId,
        },
      );
    } catch (error) {
      this.logger.error(
        'Failed to cancel pending proposals for artefact removed from last package',
        {
          artefactId,
          spaceId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  };

  private handlePlaybookArtefactMoved = async (
    event: PlaybookArtefactMovedEvent,
  ): Promise<void> => {
    const { oldArtifactId, newArtifactId, sourceSpaceId, destinationSpaceId } =
      event.payload;

    try {
      await this.changeManagementAdapter.migrateChangeProposalsForMovedArtefact(
        {
          userId: event.payload.userId,
          organizationId: event.payload.organizationId,
          source: event.payload.source,
          sourceSpaceId,
          destinationSpaceId,
          oldArtefactId: oldArtifactId,
          newArtefactId: newArtifactId,
        },
      );
    } catch (error) {
      this.logger.error('Failed to migrate proposals for moved artefact', {
        oldArtifactId,
        newArtifactId,
        sourceSpaceId,
        destinationSpaceId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}
