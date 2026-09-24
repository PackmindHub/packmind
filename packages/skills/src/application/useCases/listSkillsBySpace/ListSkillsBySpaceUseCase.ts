import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  ListSkillsBySpaceCommand,
  ListSkillsBySpaceResponse,
  IAccountsPort,
  IListSkillsBySpaceUseCase,
  ISpacesPort,
  createSpaceId,
} from '@packmind/types';
import { SkillSpaceNotAccessibleError } from '../../../domain/errors/SkillSpaceNotAccessibleError';
import { SkillService } from '../../services/SkillService';

const origin = 'ListSkillsBySpaceUseCase';

export class ListSkillsBySpaceUseCase
  extends AbstractSpaceMemberUseCase<
    ListSkillsBySpaceCommand,
    ListSkillsBySpaceResponse
  >
  implements IListSkillsBySpaceUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsAdapter: IAccountsPort,
    private readonly skillService: SkillService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsAdapter, logger);
    this.logger.info('ListSkillsBySpaceUseCase initialized');
  }

  async executeForSpaceMembers(
    command: ListSkillsBySpaceCommand & SpaceMemberContext,
  ): Promise<ListSkillsBySpaceResponse> {
    this.logger.info('Starting listSkillsBySpace process', {
      spaceId: command.spaceId,
      userId: command.userId,
      organizationId: command.organizationId,
    });

    const spaceId = createSpaceId(command.spaceId);
    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space || space.organizationId !== command.organizationId) {
      throw new SkillSpaceNotAccessibleError(
        command.spaceId,
        command.organizationId,
      );
    }

    const skills = await this.skillService.listSkillsBySpace(spaceId, {
      includeDeleted: command.includeDeleted,
    });

    this.logger.info('Skills retrieved successfully', {
      spaceId: command.spaceId,
      count: skills.length,
    });

    return skills;
  }
}
