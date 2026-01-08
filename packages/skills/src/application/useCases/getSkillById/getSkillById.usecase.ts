import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  GetSkillByIdCommand,
  GetSkillByIdResponse,
  createSkillId,
  createUserId,
  createOrganizationId,
} from '@packmind/types';
import { IGetSkillById } from '../../../domain/useCases/IGetSkillById';
import { SkillService } from '../../services/SkillService';

const origin = 'GetSkillByIdUsecase';

export class GetSkillByIdUsecase implements IGetSkillById {
  constructor(
    private readonly skillService: SkillService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('GetSkillByIdUsecase initialized');
  }

  public async execute(
    command: GetSkillByIdCommand,
  ): Promise<GetSkillByIdResponse> {
    const {
      skillId: skillIdString,
      userId: userIdString,
      organizationId: orgIdString,
    } = command;
    const skillId = createSkillId(skillIdString);
    const userId = createUserId(userIdString);
    const organizationId = createOrganizationId(orgIdString);

    this.logger.info('Starting getSkillById process', {
      skillId,
      userId,
      organizationId,
    });

    try {
      const skill = await this.skillService.getSkillById(skillId);

      if (skill) {
        this.logger.info('Skill retrieved successfully', {
          skillId,
          name: skill.name,
        });
      } else {
        this.logger.warn('Skill not found', { skillId });
      }

      return { skill };
    } catch (error) {
      this.logger.error('Failed to get skill by ID', {
        skillId: skillIdString,
        userId,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
