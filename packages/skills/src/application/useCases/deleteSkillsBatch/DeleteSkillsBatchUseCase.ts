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
import { SkillNotFoundError } from '../../../domain/errors/SkillNotFoundError';
import { SkillService } from '../../services/SkillService';

const origin = 'DeleteSkillsBatchUseCase';

export class DeleteSkillsBatchUseCase
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
    this.logger.info('DeleteSkillsBatchUseCase initialized');
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

    const validatedSkills: Array<{ skillId: SkillId; skill: Skill }> = [];

    for (const skillId of skillIds) {
      const skill = await this.skillService.getSkillById(skillId);
      const space = skill
        ? await this.spacesPort.getSpaceById(skill.spaceId)
        : null;

      if (!skill || !space || space.organizationId !== organizationId) {
        throw new SkillNotFoundError(skillId);
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
  }
}
