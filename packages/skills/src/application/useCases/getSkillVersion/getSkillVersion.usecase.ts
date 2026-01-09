import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  GetSkillVersionCommand,
  GetSkillVersionResponse,
  IAccountsPort,
  ISpacesPort,
  createSkillId,
  createSpaceId,
} from '@packmind/types';
import { IGetSkillVersion } from '../../../domain/useCases/IGetSkillVersion';
import { SkillVersionService } from '../../services/SkillVersionService';
import { SkillService } from '../../services/SkillService';

const origin = 'GetSkillVersionUsecase';

export class GetSkillVersionUsecase
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
    this.logger.info('GetSkillVersionUsecase initialized');
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

      const skillId = createSkillId(command.skillId);

      // Verify the skill exists and belongs to the space
      const skill = await this.skillService.getSkillById(skillId);
      if (!skill) {
        this.logger.warn('Skill not found', { skillId: command.skillId });
        throw new Error(`Skill with id ${command.skillId} not found`);
      }

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

      const skillVersion = await this.skillVersionService.getSkillVersion(
        skillId,
        command.version,
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
    } catch (error) {
      this.logger.error('Failed to get skill version', {
        skillId: command.skillId,
        version: command.version,
        spaceId: command.spaceId,
        userId: command.userId,
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
