import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  GetSkillByIdCommand,
  GetSkillByIdResponse,
  IAccountsPort,
  IGetSkillByIdUseCase,
  ISpacesPort,
} from '@packmind/types';
import { SkillService } from '../../services/SkillService';

const origin = 'GetSkillByIdUsecase';

export class GetSkillByIdUsecase
  extends AbstractMemberUseCase<GetSkillByIdCommand, GetSkillByIdResponse>
  implements IGetSkillByIdUseCase
{
  constructor(
    accountsAdapter: IAccountsPort,
    private readonly skillService: SkillService,
    private readonly spacesPort: ISpacesPort | null,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
    this.logger.info('GetSkillByIdUsecase initialized');
  }

  async executeForMembers(
    command: GetSkillByIdCommand & MemberContext,
  ): Promise<GetSkillByIdResponse> {
    this.logger.info('Getting skill by ID', {
      id: command.skillId,
      spaceId: command.spaceId,
    });

    try {
      // Verify the space belongs to the organization
      if (!this.spacesPort) {
        this.logger.error('SpacesPort not available for space validation');
        throw new Error('SpacesPort not available');
      }

      const space = await this.spacesPort.getSpaceById(command.spaceId);
      if (!space) {
        this.logger.warn('Space not found', { spaceId: command.spaceId });
        throw new Error(`Space with id ${command.spaceId} not found`);
      }

      if (space.organizationId !== command.organizationId) {
        this.logger.warn('Space does not belong to organization', {
          spaceId: command.spaceId,
          spaceOrganizationId: space.organizationId,
          requestOrganizationId: command.organizationId,
        });
        throw new Error(
          `Space ${command.spaceId} does not belong to organization ${command.organizationId}`,
        );
      }

      const skill = await this.skillService.getSkillById(command.skillId);

      if (!skill) {
        this.logger.info('Skill not found', { id: command.skillId });
        return { skill: null };
      }

      // Verify the skill belongs to the space
      if (skill.spaceId !== command.spaceId) {
        this.logger.warn('Skill does not belong to space', {
          skillId: command.skillId,
          skillSpaceId: skill.spaceId,
          requestSpaceId: command.spaceId,
        });
        throw new Error(
          `Skill ${command.skillId} does not belong to space ${command.spaceId}`,
        );
      }

      this.logger.info('Skill retrieved successfully', {
        id: command.skillId,
      });
      return { skill };
    } catch (error) {
      this.logger.error('Failed to get skill by ID', {
        id: command.skillId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
