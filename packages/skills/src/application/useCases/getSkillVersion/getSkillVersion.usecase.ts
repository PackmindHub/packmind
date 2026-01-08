import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  GetSkillVersionCommand,
  GetSkillVersionResponse,
  createSkillId,
  createUserId,
  createOrganizationId,
} from '@packmind/types';
import { IGetSkillVersion } from '../../../domain/useCases/IGetSkillVersion';
import { SkillVersionService } from '../../services/SkillVersionService';

const origin = 'GetSkillVersionUsecase';

export class GetSkillVersionUsecase implements IGetSkillVersion {
  constructor(
    private readonly skillVersionService: SkillVersionService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('GetSkillVersionUsecase initialized');
  }

  public async execute(
    command: GetSkillVersionCommand,
  ): Promise<GetSkillVersionResponse> {
    const {
      skillId: skillIdString,
      version,
      userId: userIdString,
      organizationId: orgIdString,
    } = command;
    const skillId = createSkillId(skillIdString);
    const userId = createUserId(userIdString);
    const organizationId = createOrganizationId(orgIdString);

    this.logger.info('Starting getSkillVersion process', {
      skillId,
      version,
      userId,
      organizationId,
    });

    try {
      const skillVersion = await this.skillVersionService.getSkillVersion(
        skillId,
        version,
      );

      if (skillVersion) {
        this.logger.info('Skill version retrieved successfully', {
          skillId,
          version,
          versionId: skillVersion.id,
        });
      } else {
        this.logger.warn('Skill version not found', { skillId, version });
      }

      return { skillVersion };
    } catch (error) {
      this.logger.error('Failed to get skill version', {
        skillId: skillIdString,
        version,
        userId,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
