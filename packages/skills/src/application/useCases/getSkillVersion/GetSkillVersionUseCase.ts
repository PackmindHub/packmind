import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  GetSkillVersionCommand,
  GetSkillVersionResponse,
  IAccountsPort,
  ISpacesPort,
  createOrganizationId,
  createSkillId,
  createSpaceId,
} from '@packmind/types';
import { SkillSpaceNotAccessibleError } from '../../../domain/errors/SkillSpaceNotAccessibleError';
import { SkillNotFoundError } from '../../../domain/errors/SkillNotFoundError';
import { SkillsPortNotAvailableError } from '../../../domain/errors/SkillsPortNotAvailableError';
import { IGetSkillVersion } from '../../../domain/useCases/IGetSkillVersion';
import { SkillVersionService } from '../../services/SkillVersionService';
import { SkillService } from '../../services/SkillService';

const origin = 'GetSkillVersionUseCase';

export class GetSkillVersionUseCase
  extends AbstractMemberUseCase<GetSkillVersionCommand, GetSkillVersionResponse>
  implements IGetSkillVersion
{
  constructor(
    accountsAdapter: IAccountsPort,
    private readonly skillVersionService: SkillVersionService,
    private readonly skillService: SkillService,
    private readonly spacesPort: ISpacesPort | null,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
    this.logger.info('GetSkillVersionUseCase initialized');
  }

  async executeForMembers(
    command: GetSkillVersionCommand & MemberContext,
  ): Promise<GetSkillVersionResponse> {
    this.logger.info('Starting getSkillVersion process', {
      skillId: command.skillId,
      version: command.version,
      spaceId: command.spaceId,
      userId: command.userId,
      organizationId: command.organizationId,
    });

    if (!this.spacesPort) {
      throw new SkillsPortNotAvailableError('SpacesPort');
    }

    const spaceId = createSpaceId(command.spaceId);
    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space || space.organizationId !== command.organizationId) {
      throw new SkillSpaceNotAccessibleError(
        command.spaceId,
        command.organizationId,
      );
    }

    const skillId = createSkillId(command.skillId);

    const skill = await this.skillService.getSkillById(skillId);
    if (!skill || skill.spaceId !== command.spaceId) {
      throw new SkillNotFoundError(command.skillId, command.spaceId);
    }

    const spaces = await this.spacesPort.listSpacesByOrganization(
      createOrganizationId(command.organizationId),
    );
    const allowedSpaceIds = spaces.map((s) => s.id);

    const skillVersion = await this.skillVersionService.getSkillVersion(
      skillId,
      command.version,
      allowedSpaceIds,
    );

    if (skillVersion) {
      this.logger.info('Skill version retrieved successfully', {
        skillId: command.skillId,
        version: command.version,
        versionId: skillVersion.id,
      });
    } else {
      this.logger.warn('Skill version not found', {
        skillId: command.skillId,
        version: command.version,
      });
    }

    return { skillVersion };
  }
}
