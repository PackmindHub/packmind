import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { SkillValidationError, SkillParseError } from '@packmind/skills';
import {
  OrganizationId,
  Skill,
  SkillId,
  SkillVersion,
  SkillWithFiles,
  SpaceId,
  UploadSkillFileInput,
  UploadSkillResponse,
} from '@packmind/types';
import { SkillsService } from './skills.service';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../guards/space-access.guard';
import { getErrorMessage } from '../../../shared/utils/error.utils';

const origin = 'OrganizationsSpacesSkillsController';

/**
 * Controller for space-scoped skill routes within organizations
 * Actual path: /organizations/:orgId/spaces/:spaceId/skills (inherited via RouterModule in AppModule)
 *
 * This controller provides space-scoped skill endpoints within organizations.
 * The path is inherited from the RouterModule configuration in AppModule:
 * - Parent: /organizations/:orgId/spaces/:spaceId (from OrganizationsSpacesModule)
 * - This controller: (empty, inherits from /skills path in RouterModule)
 * - Final path: /organizations/:orgId/spaces/:spaceId/skills
 *
 * Both OrganizationAccessGuard and SpaceAccessGuard ensure proper access control.
 */
@Controller()
@UseGuards(OrganizationAccessGuard, SpaceAccessGuard)
export class OrganizationsSpacesSkillsController {
  constructor(
    private readonly skillsService: SkillsService,
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

  /**
   * Get a skill with its files within a space
   * GET /organizations/:orgId/spaces/:spaceId/skills/:slug
   */
  @Get(':slug')
  async getSkillWithFiles(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('slug') slug: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<SkillWithFiles> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/skills/:slug - Fetching skill with files',
      { organizationId, spaceId, slug },
    );

    try {
      const skillWithFiles = await this.skillsService.getSkillWithFiles(
        slug,
        spaceId,
        organizationId,
        userId,
      );

      if (!skillWithFiles) {
        throw new NotFoundException(`Skill with slug "${slug}" not found`);
      }

      return skillWithFiles;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        'GET /organizations/:orgId/spaces/:spaceId/skills/:slug - Failed to fetch skill with files',
        { organizationId, spaceId, slug, error: errorMessage },
      );
      throw error;
    }
  }

  /**
   * Get all versions for a skill
   * GET /organizations/:orgId/spaces/:spaceId/skills/:skillId/versions
   */
  @Get(':skillId/versions')
  async getSkillVersions(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('skillId') skillId: SkillId,
    @Req() request: AuthenticatedRequest,
  ): Promise<SkillVersion[]> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/skills/:skillId/versions - Fetching skill versions',
      { organizationId, spaceId, skillId },
    );

    try {
      return await this.skillsService.listSkillVersions(
        skillId,
        spaceId,
        organizationId,
        userId,
      );
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        'GET /organizations/:orgId/spaces/:spaceId/skills/:skillId/versions - Failed to fetch skill versions',
        { organizationId, spaceId, skillId, error: errorMessage },
      );
      throw error;
    }
  }

  /**
   * Upload a skill within a space
   * POST /organizations/:orgId/spaces/:spaceId/skills/upload
   * Returns 201 Created for new skills, 200 OK for updates or if content is identical (check versionCreated flag)
   */
  @Post('upload')
  async uploadSkill(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Body()
    body: {
      files: UploadSkillFileInput[];
    },
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ): Promise<Response<UploadSkillResponse>> {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/skills/upload - Uploading skill',
      {
        organizationId,
        spaceId,
        fileCount: body.files.length,
        userId,
      },
    );

    try {
      const result = await this.skillsService.uploadSkill(
        body.files,
        organizationId,
        spaceId,
        userId,
      );

      let statusCode: HttpStatus;
      if (result.skill.version === 1 && result.versionCreated) {
        statusCode = HttpStatus.CREATED;
      } else {
        statusCode = HttpStatus.OK;
      }

      return response.status(statusCode).json(result);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        'POST /organizations/:orgId/spaces/:spaceId/skills/upload - Failed to upload skill',
        {
          organizationId,
          spaceId,
          error: errorMessage,
        },
      );

      // Convert domain errors to HTTP exceptions
      if (error instanceof SkillValidationError) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof SkillParseError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }
}
