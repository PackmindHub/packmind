import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  ListSkillsBySpaceCommand,
  ListSkillsBySpaceResponse,
  IAccountsPort,
  IListSkillsBySpaceUseCase,
  ISpacesPort,
  createSpaceId,
} from '@packmind/types';
import { SkillService } from '../../services/SkillService';

const origin = 'ListSkillsBySpaceUsecase';

export class ListSkillsBySpaceUsecase
  extends AbstractMemberUseCase<
    ListSkillsBySpaceCommand,
    ListSkillsBySpaceResponse
  >
  implements IListSkillsBySpaceUseCase
{
  constructor(
    accountsAdapter: IAccountsPort,
    private readonly skillService: SkillService,
    private readonly spacesPort: ISpacesPort | null,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
    this.logger.info('ListSkillsBySpaceUsecase initialized');
  }

  async executeForMembers(
    command: ListSkillsBySpaceCommand & MemberContext,
  ): Promise<ListSkillsBySpaceResponse> {
    this.logger.info('Starting listSkillsBySpace process', {
      spaceId: command.spaceId,
      userId: command.userId,
      organizationId: command.organizationId,
    });

    try {
      // Verify the space belongs to the organization
      if (!this.spacesPort) {
        this.logger.error('SpacesPort not available for space validation');
        throw new Error('SpacesPort not available');
      }

      const spaceId = createSpaceId(command.spaceId);
      const space = await this.spacesPort.getSpaceById(spaceId);
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

      const skills = await this.skillService.listSkillsBySpace(spaceId);

      this.logger.info('Skills retrieved successfully', {
        spaceId: command.spaceId,
        count: skills.length,
      });

      return skills;
    } catch (error) {
      this.logger.error('Failed to list skills by space', {
        spaceId: command.spaceId,
        userId: command.userId,
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
