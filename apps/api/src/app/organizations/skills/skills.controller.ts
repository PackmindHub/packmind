import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import {
  DeployDefaultSkillsCommand,
  DeployDefaultSkillsResponse,
  DownloadDefaultSkillsZipFileCommand,
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

  @Get('default/zip')
  async downloadDefaultSkillsZip(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ): Promise<void> {
    this.logger.info(
      'GET /organizations/:orgId/skills/default/zip - Downloading default skills zip',
      {
        organizationId,
      },
    );

    try {
      const command: DownloadDefaultSkillsZipFileCommand = {
        userId: request.user.userId,
        organizationId,
        source: request.clientSource,
      };

      const result = await this.skillsService.downloadDefaultSkillsZip(command);

      this.logger.info(
        'GET /organizations/:orgId/skills/default/zip - Default skills zip created successfully',
        {
          organizationId,
          fileName: result.fileName,
        },
      );

      response
        .setHeader('Content-Type', 'application/zip')
        .setHeader(
          'Content-Disposition',
          `attachment; filename="${result.fileName}"`,
        )
        .send(Buffer.from(result.fileContent, 'base64'));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/skills/default/zip - Failed to download default skills zip',
        {
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
