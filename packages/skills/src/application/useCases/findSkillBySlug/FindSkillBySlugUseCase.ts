import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  FindSkillBySlugCommand,
  FindSkillBySlugResponse,
  IAccountsPort,
  IFindSkillBySlugUseCase,
  ISpacesPort,
  createOrganizationId,
  createSpaceId,
} from '@packmind/types';
import { SkillSpaceNotAccessibleError } from '../../../domain/errors/SkillSpaceNotAccessibleError';
import { SkillsPortNotAvailableError } from '../../../domain/errors/SkillsPortNotAvailableError';
import { SkillService } from '../../services/SkillService';

const origin = 'FindSkillBySlugUseCase';

export class FindSkillBySlugUseCase
  extends AbstractMemberUseCase<FindSkillBySlugCommand, FindSkillBySlugResponse>
  implements IFindSkillBySlugUseCase
{
  constructor(
    accountsAdapter: IAccountsPort,
    private readonly skillService: SkillService,
    private readonly spacesPort: ISpacesPort | null,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
    this.logger.info('FindSkillBySlugUseCase initialized');
  }

  async executeForMembers(
    command: FindSkillBySlugCommand & MemberContext,
  ): Promise<FindSkillBySlugResponse> {
    this.logger.info('Starting findSkillBySlug process', {
      slug: command.slug,
      userId: command.userId,
      organizationId: command.organizationId,
    });

    const commandWithSpace = command as FindSkillBySlugCommand & {
      spaceId?: string;
    };
    if (commandWithSpace.spaceId) {
      if (!this.spacesPort) {
        throw new SkillsPortNotAvailableError('SpacesPort');
      }

      const spaceId = createSpaceId(commandWithSpace.spaceId);
      const space = await this.spacesPort.getSpaceById(spaceId);
      if (!space || space.organizationId !== command.organizationId) {
        throw new SkillSpaceNotAccessibleError(
          commandWithSpace.spaceId,
          command.organizationId,
        );
      }
    }

    const organizationId = createOrganizationId(command.organizationId);
    const skill = await this.skillService.findSkillBySlug(
      command.slug,
      organizationId,
    );

    if (skill) {
      this.logger.info('Skill found by slug', {
        slug: command.slug,
        skillId: skill.id,
        name: skill.name,
      });
    } else {
      this.logger.warn('Skill not found by slug', {
        slug: command.slug,
        organizationId: command.organizationId,
      });
    }

    return { skill };
  }
}
