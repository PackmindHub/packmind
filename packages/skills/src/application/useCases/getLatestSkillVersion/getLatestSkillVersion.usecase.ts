import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  GetLatestSkillVersionCommand,
  GetLatestSkillVersionResponse,
  createSkillId,
  createUserId,
  createOrganizationId,
} from '@packmind/types';
import { IGetLatestSkillVersion } from '../../../domain/useCases/IGetLatestSkillVersion';
import { SkillVersionService } from '../../services/SkillVersionService';

const origin = 'GetLatestSkillVersionUsecase';

export class GetLatestSkillVersionUsecase implements IGetLatestSkillVersion {
  constructor(
    private readonly skillVersionService: SkillVersionService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('GetLatestSkillVersionUsecase initialized');
  }

  public async execute(
    command: GetLatestSkillVersionCommand,
  ): Promise<GetLatestSkillVersionResponse> {
    const {
      skillId: skillIdString,
      userId: userIdString,
      organizationId: orgIdString,
    } = command;
    const skillId = createSkillId(skillIdString);
    const userId = createUserId(userIdString);
    const organizationId = createOrganizationId(orgIdString);

    this.logger.info('Starting getLatestSkillVersion process', {
      skillId,
      userId,
      organizationId,
    });

    try {
      const skillVersion =
        await this.skillVersionService.getLatestSkillVersion(skillId);

      if (skillVersion) {
        this.logger.info('Latest skill version retrieved successfully', {
          skillId,
          version: skillVersion.version,
          versionId: skillVersion.id,
        });
      } else {
        this.logger.warn('No skill versions found', { skillId });
      }

      return { skillVersion };
    } catch (error) {
      this.logger.error('Failed to get latest skill version', {
        skillId: skillIdString,
        userId,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
