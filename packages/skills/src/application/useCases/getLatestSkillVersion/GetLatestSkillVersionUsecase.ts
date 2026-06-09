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
import { IGetLatestSkillVersion } from '../../../domain/useCases/IGetLatestSkillVersion';
import { SkillVersionService } from '../../services/SkillVersionService';
import { SkillService } from '../../services/SkillService';

const origin = 'GetLatestSkillVersionUsecase';

export class GetLatestSkillVersionUsecase
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
    this.logger.info('GetLatestSkillVersionUsecase initialized');
  }

  async executeForMembers(
    command: GetLatestSkillVersionCommand & MemberContext,
  ): Promise<GetLatestSkillVersionResponse> {
    this.logger.info('Getting latest skill version', {
      skillId: command.skillId,
      spaceId: command.spaceId,
    });

    try {
      const skillId = createSkillId(command.skillId);
      const spaceId = createSpaceId(command.spaceId);

      // Verify the space belongs to the organization
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

      // Get the skill to verify it belongs to the space
      const skill = await this.skillService.getSkillById(skillId);
      if (!skill) {
        this.logger.warn('Skill not found', { skillId: command.skillId });
        throw new Error(`Skill with id ${command.skillId} not found`);
      }

      if (skill.spaceId !== spaceId) {
        this.logger.warn('Skill does not belong to space', {
          skillId: command.skillId,
          skillSpaceId: skill.spaceId,
          requestSpaceId: command.spaceId,
        });
        throw new Error(
          `Skill ${command.skillId} does not belong to space ${command.spaceId}`,
        );
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
    } catch (error) {
      this.logger.error('Failed to get latest skill version', {
        skillId: command.skillId,
        spaceId: command.spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
