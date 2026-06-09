import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  DeleteSkillsBatchCommand,
  DeleteSkillsBatchResponse,
  IAccountsPort,
  IDeleteSkillsBatchUseCase,
  ISpacesPort,
  Skill,
  SkillDeletedEvent,
  SkillId,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { SkillService } from '../../services/SkillService';

const origin = 'DeleteSkillsBatchUsecase';

export class DeleteSkillsBatchUsecase
  extends AbstractSpaceMemberUseCase<
    DeleteSkillsBatchCommand,
    DeleteSkillsBatchResponse
  >
  implements IDeleteSkillsBatchUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly skillService: SkillService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsPort, logger);
    this.logger.info('DeleteSkillsBatchUsecase initialized');
  }

  async executeForSpaceMembers(
    command: DeleteSkillsBatchCommand & SpaceMemberContext,
  ): Promise<DeleteSkillsBatchResponse> {
    const {
      skillIds,
      organizationId: orgIdString,
      userId: userIdString,
      source = 'ui',
    } = command;
    const organizationId = createOrganizationId(orgIdString);
    const userId = createUserId(userIdString);

    this.logger.info('Starting deleteSkillsBatch process', {
      skillCount: skillIds.length,
      organizationId,
      userId,
    });

    if (skillIds.length === 0) {
      this.logger.warn('No skills to delete');
      return { success: true };
    }

    try {
      const validatedSkills: Array<{ skillId: SkillId; skill: Skill }> = [];

      for (const skillId of skillIds) {
        const skill = await this.skillService.getSkillById(skillId);

        if (!skill) {
          this.logger.error('Skill not found for deletion', { skillId });
          throw new Error(`Skill with id ${skillId} not found`);
        }

        const space = await this.spacesPort.getSpaceById(skill.spaceId);
        if (!space) {
          this.logger.warn('Space not found', { spaceId: skill.spaceId });
          throw new Error(`Space with id ${skill.spaceId} not found`);
        }

        if (space.organizationId !== organizationId) {
          this.logger.warn('Space does not belong to organization', {
            spaceId: skill.spaceId,
            spaceOrganizationId: space.organizationId,
            requestOrganizationId: organizationId,
          });
          throw new Error(
            `Space ${skill.spaceId} does not belong to organization ${organizationId}`,
          );
        }

        validatedSkills.push({ skillId, skill });
      }

      await Promise.all(
        validatedSkills.map(({ skillId }) =>
          this.skillService.deleteSkill(skillId, command.user.id),
        ),
      );

      this.logger.info('Skills deleted successfully', {
        skillCount: validatedSkills.length,
        organizationId,
        userId,
      });

      for (const { skillId, skill } of validatedSkills) {
        this.eventEmitterService.emit(
          new SkillDeletedEvent({
            skillId,
            spaceId: skill.spaceId,
            organizationId,
            userId,
            source,
          }),
        );
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to delete skills batch', {
        skillCount: skillIds.length,
        organizationId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
