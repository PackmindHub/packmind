import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { OrganizationId, Skill, SpaceId } from '@packmind/types';
import { SpaceSkillsService } from './skills.service';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../guards/space-access.guard';

const origin = 'OrganizationsSpacesSkillsController';

/**
 * Controller for space-scoped skill routes within organizations
 * Actual path: /organizations/:orgId/spaces/:spaceId/skills (inherited via RouterModule in AppModule)
 */
@Controller()
@UseGuards(OrganizationAccessGuard, SpaceAccessGuard)
export class OrganizationsSpacesSkillsController {
  constructor(
    private readonly skillsService: SpaceSkillsService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('OrganizationsSpacesSkillsController initialized');
  }

  /**
   * Get all skills for a space within an organization
   * GET /organizations/:orgId/spaces/:spaceId/skills
   */
  @Get()
  async getSkills(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Req() request: AuthenticatedRequest,
  ): Promise<Skill[]> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/skills - Fetching skills',
      { organizationId, spaceId },
    );

    try {
      return await this.skillsService.getSkillsBySpace(
        spaceId,
        organizationId,
        userId,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/spaces/:spaceId/skills - Failed to fetch skills',
        { organizationId, spaceId, error: errorMessage },
      );
      throw error;
    }
  }
}
