import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  GetSkillByIdCommand,
  GetSkillByIdResponse,
  IAccountsPort,
  IGetSkillByIdUseCase,
  ISpacesPort,
} from '@packmind/types';
import { SkillSpaceNotAccessibleError } from '../../../domain/errors/SkillSpaceNotAccessibleError';
import { SkillService } from '../../services/SkillService';

const origin = 'GetSkillByIdUseCase';

export class GetSkillByIdUseCase
  extends AbstractSpaceMemberUseCase<GetSkillByIdCommand, GetSkillByIdResponse>
  implements IGetSkillByIdUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsAdapter: IAccountsPort,
    private readonly skillService: SkillService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsAdapter, logger);
    this.logger.info('GetSkillByIdUseCase initialized');
  }

  async executeForSpaceMembers(
    command: GetSkillByIdCommand & SpaceMemberContext,
  ): Promise<GetSkillByIdResponse> {
    this.logger.info('Getting skill by ID', {
      id: command.skillId,
      spaceId: command.spaceId,
    });

    const space = await this.spacesPort.getSpaceById(command.spaceId);
    if (!space || space.organizationId !== command.organizationId) {
      throw new SkillSpaceNotAccessibleError(
        command.spaceId,
        command.organizationId,
      );
    }

    const skill = await this.skillService.getSkillById(command.skillId);

    if (!skill || skill.spaceId !== command.spaceId) {
      this.logger.info('Skill not found', { id: command.skillId });
      return { skill: null };
    }

    this.logger.info('Skill retrieved successfully', {
      id: command.skillId,
    });
    return { skill };
  }
}
