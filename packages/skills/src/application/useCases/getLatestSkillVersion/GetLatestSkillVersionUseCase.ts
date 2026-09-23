import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  GetLatestSkillVersionCommand,
  GetLatestSkillVersionResponse,
  IAccountsPort,
  ISpacesPort,
  createSkillId,
  createSpaceId,
} from '@packmind/types';
import { SkillSpaceNotAccessibleError } from '../../../domain/errors/SkillSpaceNotAccessibleError';
import { SkillNotFoundError } from '../../../domain/errors/SkillNotFoundError';
import { IGetLatestSkillVersion } from '../../../domain/useCases/IGetLatestSkillVersion';
import { SkillVersionService } from '../../services/SkillVersionService';
import { SkillService } from '../../services/SkillService';

const origin = 'GetLatestSkillVersionUseCase';

export class GetLatestSkillVersionUseCase
  extends AbstractMemberUseCase<
    GetLatestSkillVersionCommand,
    GetLatestSkillVersionResponse
  >
  implements IGetLatestSkillVersion
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly skillService: SkillService,
    private readonly skillVersionService: SkillVersionService,
    private readonly spacesPort: ISpacesPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
    this.logger.info('GetLatestSkillVersionUseCase initialized');
  }

  async executeForMembers(
    command: GetLatestSkillVersionCommand & MemberContext,
  ): Promise<GetLatestSkillVersionResponse> {
    this.logger.info('Getting latest skill version', {
      skillId: command.skillId,
      spaceId: command.spaceId,
    });

    const skillId = createSkillId(command.skillId);
    const spaceId = createSpaceId(command.spaceId);

    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space || space.organizationId !== command.organizationId) {
      throw new SkillSpaceNotAccessibleError(
        command.spaceId,
        command.organizationId,
      );
    }

    const skill = await this.skillService.getSkillById(skillId);
    if (!skill || skill.spaceId !== spaceId) {
      throw new SkillNotFoundError(command.skillId, command.spaceId);
    }

    const skillVersion =
      await this.skillVersionService.getLatestSkillVersion(skillId);

    if (skillVersion) {
      this.logger.info('Latest skill version retrieved successfully', {
        skillId: command.skillId,
        version: skillVersion.version,
        versionId: skillVersion.id,
      });
    } else {
      this.logger.warn('No skill versions found', {
        skillId: command.skillId,
      });
    }

    return { skillVersion };
  }
}
