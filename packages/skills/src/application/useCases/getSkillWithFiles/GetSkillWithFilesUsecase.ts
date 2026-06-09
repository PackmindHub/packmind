import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  createOrganizationId,
  GetSkillWithFilesCommand,
  GetSkillWithFilesResponse,
  IAccountsPort,
  IGetSkillWithFilesUseCase,
} from '@packmind/types';
import { SkillFileService } from '../../services/SkillFileService';
import { SkillService } from '../../services/SkillService';
import { SkillVersionService } from '../../services/SkillVersionService';

const origin = 'GetSkillWithFilesUsecase';

export class GetSkillWithFilesUsecase
  extends AbstractMemberUseCase<
    GetSkillWithFilesCommand,
    GetSkillWithFilesResponse
  >
  implements IGetSkillWithFilesUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly skillService: SkillService,
    private readonly skillVersionService: SkillVersionService,
    private readonly skillFileService: SkillFileService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: GetSkillWithFilesCommand & MemberContext,
  ): Promise<GetSkillWithFilesResponse> {
    const { slug, spaceId } = command;
    const organizationId = createOrganizationId(command.organizationId);

    try {
      this.logger.info('Getting skill with files', { slug, spaceId });

      const skill = await this.skillService.findSkillBySlug(
        slug,
        organizationId,
      );

      if (!skill) {
        this.logger.info('Skill not found', { slug });
        return { skillWithFiles: null };
      }

      if (skill.spaceId !== spaceId) {
        this.logger.info('Skill does not belong to space', {
          slug,
          skillSpaceId: skill.spaceId,
          requestedSpaceId: spaceId,
        });
        return { skillWithFiles: null };
      }

      const latestVersion =
        await this.skillVersionService.getLatestSkillVersion(skill.id);

      if (!latestVersion) {
        this.logger.info('No version found for skill', {
          slug,
          skillId: skill.id,
        });
        return { skillWithFiles: null };
      }

      const files = await this.skillFileService.findByVersionId(
        latestVersion.id,
      );

      this.logger.info('Skill with files retrieved successfully', {
        slug,
        skillId: skill.id,
        versionId: latestVersion.id,
        fileCount: files.length,
      });

      return {
        skillWithFiles: {
          skill,
          files,
          latestVersion,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get skill with files', {
        slug,
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
