import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { OrganizationId, Skill, UploadSkillFileInput } from '@packmind/types';
import { OrganizationSkillsService } from './skills.service';
import { OrganizationAccessGuard } from '../guards/organization-access.guard';

const origin = 'OrganizationSkillsController';

@Controller()
@UseGuards(OrganizationAccessGuard)
export class OrganizationSkillsController {
  constructor(
    private readonly skillsService: OrganizationSkillsService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('OrganizationSkillsController initialized');
  }

  @Post('upload')
  async uploadSkill(
    @Param('orgId') organizationId: OrganizationId,
    @Body()
    body: {
      files: UploadSkillFileInput[];
    },
    @Req() request: AuthenticatedRequest,
  ): Promise<Skill> {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/skills/upload - Uploading skill',
      { organizationId, fileCount: body.files.length },
    );

    try {
      return await this.skillsService.uploadSkill(
        body.files,
        organizationId,
        userId,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/skills/upload - Failed to upload skill',
        { organizationId, error: errorMessage },
      );
      throw error;
    }
  }
}
