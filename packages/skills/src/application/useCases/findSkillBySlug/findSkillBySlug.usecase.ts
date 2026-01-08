import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  FindSkillBySlugCommand,
  FindSkillBySlugResponse,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { IFindSkillBySlug } from '../../../domain/useCases/IFindSkillBySlug';
import { SkillService } from '../../services/SkillService';

const origin = 'FindSkillBySlugUsecase';

export class FindSkillBySlugUsecase implements IFindSkillBySlug {
  constructor(
    private readonly skillService: SkillService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('FindSkillBySlugUsecase initialized');
  }

  public async execute(
    command: FindSkillBySlugCommand,
  ): Promise<FindSkillBySlugResponse> {
    const { slug, userId: userIdString, organizationId: orgIdString } = command;
    const userId = createUserId(userIdString);
    const organizationId = createOrganizationId(orgIdString);

    this.logger.info('Starting findSkillBySlug process', {
      slug,
      userId,
      organizationId,
    });

    try {
      const skill = await this.skillService.findSkillBySlug(
        slug,
        organizationId,
      );

      if (skill) {
        this.logger.info('Skill found by slug', {
          slug,
          skillId: skill.id,
          name: skill.name,
        });
      } else {
        this.logger.warn('Skill not found by slug', { slug, organizationId });
      }

      return { skill };
    } catch (error) {
      this.logger.error('Failed to find skill by slug', {
        slug,
        userId,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
