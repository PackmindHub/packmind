import { LogLevel, PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  DeleteSkillCommand,
  DeleteSkillResponse,
  SkillDeletedEvent,
  createOrganizationId,
  createSkillId,
  createUserId,
} from '@packmind/types';
import { IDeleteSkill } from '../../../domain/useCases/IDeleteSkill';
import { SkillService } from '../../services/SkillService';

const origin = 'DeleteSkillUsecase';

export class DeleteSkillUsecase implements IDeleteSkill {
  constructor(
    private readonly skillService: SkillService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('DeleteSkillUsecase initialized');
  }

  public async execute(
    command: DeleteSkillCommand,
  ): Promise<DeleteSkillResponse> {
    const {
      skillId: skillIdString,
      organizationId: orgIdString,
      userId: userIdString,
    } = command;
    const organizationId = createOrganizationId(orgIdString);
    const userId = createUserId(userIdString);
    const skillId = createSkillId(skillIdString);

    this.logger.info('Starting deleteSkill process', {
      skillId,
      organizationId,
      userId,
    });

    try {
      // Get existing skill to retrieve spaceId for event
      const existingSkill = await this.skillService.getSkillById(skillId);
      if (!existingSkill) {
        this.logger.error('Skill not found for deletion', { skillId });
        throw new Error(`Skill with id ${skillId} not found`);
      }

      this.logger.info('Skill found for deletion', {
        skillId,
        name: existingSkill.name,
      });

      // Perform soft delete
      await this.skillService.deleteSkill(skillId, userId);

      this.logger.info('Skill deleted successfully', {
        skillId,
        organizationId,
        userId,
      });

      this.eventEmitterService.emit(
        new SkillDeletedEvent({
          skillId,
          spaceId: existingSkill.spaceId,
          organizationId,
          userId,
          source: 'ui',
        }),
      );

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to delete skill', {
        skillId: skillIdString,
        organizationId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
