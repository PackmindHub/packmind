import { PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
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
import { SkillService } from '../../services/SkillService';

const origin = 'DeleteSkillUsecase';

export class DeleteSkillUsecase
  extends AbstractMemberUseCase<DeleteSkillCommand, DeleteSkillResponse>
  implements IDeleteSkillUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly skillService: SkillService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
    this.logger.info('DeleteSkillUsecase initialized');
  }

  async executeForMembers(
    command: DeleteSkillCommand & MemberContext,
  ): Promise<DeleteSkillResponse> {
    const {
      skillId: skillIdString,
      organizationId: orgIdString,
      userId: userIdString,
    } = command;
    const skillId = createSkillId(skillIdString);
    const organizationId = createOrganizationId(orgIdString);
    const userId = createUserId(userIdString);

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
        spaceId: existingSkill.spaceId,
      });

      // Verify the space belongs to the organization
      const space = await this.spacesPort.getSpaceById(existingSkill.spaceId);
      if (!space) {
        this.logger.warn('Space not found', { spaceId: existingSkill.spaceId });
        throw new Error(`Space with id ${existingSkill.spaceId} not found`);
      }

      if (space.organizationId !== organizationId) {
        this.logger.warn('Space does not belong to organization', {
          spaceId: existingSkill.spaceId,
          spaceOrganizationId: space.organizationId,
          requestOrganizationId: organizationId,
        });
        throw new Error(
          `Space ${existingSkill.spaceId} does not belong to organization ${organizationId}`,
        );
      }

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
