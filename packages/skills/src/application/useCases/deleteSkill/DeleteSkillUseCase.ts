import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  DeleteSkillCommand,
  DeleteSkillResponse,
  IAccountsPort,
  IDeleteSkillUseCase,
  ISpacesPort,
  SkillDeletedEvent,
  createOrganizationId,
  createSkillId,
  createUserId,
} from '@packmind/types';
import { SkillNotFoundError } from '../../../domain/errors/SkillNotFoundError';
import { SkillService } from '../../services/SkillService';

const origin = 'DeleteSkillUseCase';

export class DeleteSkillUseCase
  extends AbstractSpaceMemberUseCase<DeleteSkillCommand, DeleteSkillResponse>
  implements IDeleteSkillUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly skillService: SkillService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsPort, logger);
    this.logger.info('DeleteSkillUseCase initialized');
  }

  async executeForSpaceMembers(
    command: DeleteSkillCommand & SpaceMemberContext,
  ): Promise<DeleteSkillResponse> {
    const {
      skillId: skillIdString,
      organizationId: orgIdString,
      userId: userIdString,
      source = 'ui',
    } = command;
    const skillId = createSkillId(skillIdString);
    const organizationId = createOrganizationId(orgIdString);
    const userId = createUserId(userIdString);

    this.logger.info('Starting deleteSkill process', {
      skillId,
      organizationId,
      userId,
    });

    // Get existing skill to retrieve spaceId for event
    const existingSkill = await this.skillService.getSkillById(skillId);
    const space = existingSkill
      ? await this.spacesPort.getSpaceById(existingSkill.spaceId)
      : null;
    if (!existingSkill || !space || space.organizationId !== organizationId) {
      throw new SkillNotFoundError(skillId);
    }

    this.logger.info('Skill found for deletion', {
      skillId,
      name: existingSkill.name,
      spaceId: existingSkill.spaceId,
    });

    // Perform soft delete
    await this.skillService.deleteSkill(skillId, command.user.id);

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
        source,
      }),
    );

    return { success: true };
  }
}
