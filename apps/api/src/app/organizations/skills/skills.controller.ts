import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import {
  DeployDefaultSkillsCommand,
  DeployDefaultSkillsResponse,
  OrganizationId,
} from '@packmind/types';
import { OrganizationSkillsService } from './skills.service';
import { PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { OrganizationAccessGuard } from '../guards/organization-access.guard';

const origin = 'OrganizationSkillsController';

@Controller()
@UseGuards(OrganizationAccessGuard)
export class OrganizationSkillsController {
  constructor(
    private readonly skillsService: OrganizationSkillsService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('OrganizationSkillsController initialized');
  }

  @Get('default')
  async getDefaultSkills(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
  ): Promise<DeployDefaultSkillsResponse> {
    this.logger.info(
      'GET /organizations/:orgId/skills/default - Fetching default skills',
      {
        organizationId,
      },
    );

    try {
      const command: DeployDefaultSkillsCommand = {
        userId: request.user.userId,
        organizationId,
        source: request.clientSource,
      };

      const result = await this.skillsService.deployDefaultSkills(command);

      this.logger.info(
        'GET /organizations/:orgId/skills/default - Default skills fetched successfully',
        {
          organizationId,
          createOrUpdateCount: result.fileUpdates.createOrUpdate.length,
          deleteCount: result.fileUpdates.delete.length,
        },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/skills/default - Failed to fetch default skills',
        {
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
