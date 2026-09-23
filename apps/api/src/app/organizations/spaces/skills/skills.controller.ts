import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { SkillNotFoundError } from '@packmind/skills';
import {
  CodingAgent,
  CodingAgents,
  DeleteSkillsBatchResponse,
  OrganizationId,
  Skill,
  SkillId,
  SkillVersion,
  SkillWithFiles,
  SpaceId,
  UpdateSkillFileFromUIResponse,
  UploadSkillFileInput,
  UploadSkillResponse,
  UserId,
} from '@packmind/types';
import { SkillsService } from './skills.service';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';

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
 * OrganizationAccessGuard ensures proper access control.
 */
@Controller()
@UseGuards(OrganizationAccessGuard)
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

    return this.skillsService.getSkillsBySpace(spaceId, organizationId, userId);
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
  }

  /**
   * Get a skill with its files by ID within a space
   * GET /organizations/:orgId/spaces/:spaceId/skills/:skillId/detail
   */
  @Get(':skillId/detail')
  async getSkillWithFilesById(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('skillId') skillId: SkillId,
    @Req() request: AuthenticatedRequest,
  ): Promise<SkillWithFiles> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/skills/:skillId/detail - Fetching skill with files by ID',
      { organizationId, spaceId, skillId },
    );

    const skillWithFiles = await this.skillsService.getSkillWithFilesById(
      skillId,
      spaceId,
      organizationId,
      userId,
    );

    if (!skillWithFiles) {
      throw new SkillNotFoundError(skillId, spaceId);
    }

    return skillWithFiles;
  }

  /**
   * Get the latest version number of a skill
   * GET /organizations/:orgId/spaces/:spaceId/skills/:skillId/latest-version
   */
  @Get(':skillId/latest-version')
  async getSkillLatestVersion(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('skillId') skillId: SkillId,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ version: number }> {
    const userId = request.user.userId as UserId;
    this.logger.info('Getting latest version for skill', {
      organizationId,
      skillId,
      userId: userId.substring(0, 6) + '*',
    });

    const version = await this.skillsService.getLatestVersionNumber({
      skillId,
      spaceId,
      organizationId,
      userId,
    });

    if (version === null) {
      throw new SkillNotFoundError(skillId, spaceId);
    }

    return { version };
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

    return this.skillsService.listSkillVersions(
      skillId,
      spaceId,
      organizationId,
      userId,
    );
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
      originSkill?: string;
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

    const result = await this.skillsService.uploadSkill(
      body.files,
      organizationId,
      spaceId,
      userId,
      request.clientSource,
      body.originSkill,
    );

    let statusCode: HttpStatus;
    if (result.skill.version === 1 && result.versionCreated) {
      statusCode = HttpStatus.CREATED;
    } else {
      statusCode = HttpStatus.OK;
    }

    return response.status(statusCode).json(result);
  }

  /**
   * Update a skill file's content from the UI
   * PATCH /organizations/:orgId/spaces/:spaceId/skills/:skillId/file
   */
  @Patch(':skillId/file')
  async updateSkillFile(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('skillId') skillId: SkillId,
    @Body() body: { filePath: string; content: string },
    @Req() request: AuthenticatedRequest,
  ): Promise<UpdateSkillFileFromUIResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'PATCH /organizations/:orgId/spaces/:spaceId/skills/:skillId/file - Updating skill file',
      { organizationId, spaceId, skillId, filePath: body.filePath },
    );

    return this.skillsService.updateSkillFile({
      skillId,
      spaceId,
      organizationId,
      userId,
      filePath: body.filePath,
      content: body.content,
      source: request.clientSource,
    });
  }

  /**
   * Delete a skill within a space
   * DELETE /organizations/:orgId/spaces/:spaceId/skills/:skillId
   */
  @Delete(':skillId')
  async deleteSkill(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('skillId') skillId: SkillId,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const userId = request.user.userId;

    this.logger.info(
      'DELETE /organizations/:orgId/spaces/:spaceId/skills/:skillId - Deleting skill',
      { organizationId, spaceId, skillId },
    );

    await this.skillsService.deleteSkill(
      skillId,
      spaceId,
      organizationId,
      userId,
      request.clientSource,
    );
  }

  /**
   * Download a skill as a zip file rendered for a specific coding agent
   * GET /organizations/:orgId/spaces/:spaceId/skills/:skillId/download/:agent
   */
  @Get(':skillId/download/:agent')
  async downloadSkillZipForAgent(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('skillId') skillId: SkillId,
    @Param('agent') agent: string,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ): Promise<void> {
    const userId = request.user.userId;

    if (!(agent in CodingAgents)) {
      throw new BadRequestException(`Unsupported agent: ${agent}`);
    }

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/skills/:skillId/download/:agent - Downloading skill zip',
      { organizationId, spaceId, skillId, agent },
    );

    const result = await this.skillsService.downloadSkillZipForAgent(
      skillId,
      spaceId,
      organizationId,
      userId,
      agent as CodingAgent,
    );

    if (!result.fileContent) {
      throw new SkillNotFoundError(skillId, spaceId);
    }

    response
      .setHeader('Content-Type', 'application/zip')
      .setHeader(
        'Content-Disposition',
        `attachment; filename="${result.fileName}"`,
      )
      .send(Buffer.from(result.fileContent, 'base64'));
  }

  /**
   * Delete multiple skills within a space
   * POST /organizations/:orgId/spaces/:spaceId/skills/delete
   */
  @Post('delete')
  async deleteSkillsBatch(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Body() body: { skillIds: SkillId[] },
    @Req() request: AuthenticatedRequest,
  ): Promise<DeleteSkillsBatchResponse> {
    const userId = request.user.userId;

    if (!body.skillIds || body.skillIds.length === 0) {
      throw new BadRequestException(
        'skillIds array is required and must not be empty',
      );
    }

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/skills/delete - Deleting skills batch',
      { organizationId, spaceId, skillCount: body.skillIds.length },
    );

    return this.skillsService.deleteSkillsBatch(
      body.skillIds,
      spaceId,
      organizationId,
      userId,
      request.clientSource,
    );
  }
}
