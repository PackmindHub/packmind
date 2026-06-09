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
import { SkillService } from '../../services/SkillService';

const origin = 'FindSkillBySlugUsecase';

export class FindSkillBySlugUsecase
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
    this.logger.info('FindSkillBySlugUsecase initialized');
  }

  async executeForMembers(
    command: FindSkillBySlugCommand & MemberContext,
  ): Promise<FindSkillBySlugResponse> {
    this.logger.info('Starting findSkillBySlug process', {
      slug: command.slug,
      userId: command.userId,
      organizationId: command.organizationId,
    });

    try {
      // Verify the space belongs to the organization if spaceId is provided
      const commandWithSpace = command as FindSkillBySlugCommand & {
        spaceId?: string;
      };
      if (commandWithSpace.spaceId) {
        if (!this.spacesPort) {
          this.logger.error('SpacesPort not available for space validation');
          throw new Error('SpacesPort not available');
        }

        const spaceId = createSpaceId(commandWithSpace.spaceId);
        const space = await this.spacesPort.getSpaceById(spaceId);
        if (!space) {
          this.logger.warn('Space not found', {
            spaceId: commandWithSpace.spaceId,
          });
          throw new Error(
            `Space with id ${commandWithSpace.spaceId} not found`,
          );
        }

        if (space.organizationId !== command.organizationId) {
          this.logger.warn('Space does not belong to organization', {
            spaceId: commandWithSpace.spaceId,
            spaceOrganizationId: space.organizationId,
            requestOrganizationId: command.organizationId,
          });
          throw new Error(
            `Space ${commandWithSpace.spaceId} does not belong to organization ${command.organizationId}`,
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
    } catch (error) {
      this.logger.error('Failed to find skill by slug', {
        slug: command.slug,
        userId: command.userId,
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
