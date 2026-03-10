import { PackmindLogger } from '@packmind/logger';
import { PackmindListener } from '@packmind/node-utils';
import { SkillDeletedEvent, StandardDeletedEvent } from '@packmind/types';
import { ChangeProposalService } from '../services/ChangeProposalService';

const origin = 'ChangeManagementListener';

export class ChangeManagementListener extends PackmindListener<ChangeProposalService> {
  constructor(
    adapter: ChangeProposalService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(adapter);
  }

  protected registerHandlers(): void {
    this.subscribe(StandardDeletedEvent, this.handleStandardDeleted);
    this.subscribe(SkillDeletedEvent, this.handleSkillDeleted);
  }

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
}
