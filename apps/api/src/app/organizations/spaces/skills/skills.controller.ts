import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  GetSkillByIdResponse,
  ListSkillsBySpaceResponse,
  OrganizationId,
  Skill,
  SkillId,
  SkillVersion,
  SpaceId,
  UploadSkillFileInput,
} from '@packmind/types';
import { SkillsService } from './skills.service';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../guards/space-access.guard';

const origin = 'OrganizationsSpacesSkillsController';

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

  @Get()
  async getSkills(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListSkillsBySpaceResponse> {
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

  @Post()
  async createSkill(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Body()
    body: {
      name: string;
      description: string;
      prompt: string;
      license?: string;
      compatibility?: string;
      metadata?: Record<string, string>;
      allowedTools?: string;
    },
    @Req() request: AuthenticatedRequest,
  ): Promise<Skill> {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/skills - Creating skill',
      { organizationId, spaceId, name: body.name },
    );

    try {
      return await this.skillsService.createSkill(
        body,
        organizationId,
        userId,
        spaceId,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/spaces/:spaceId/skills - Failed to create skill',
        { organizationId, spaceId, error: errorMessage },
      );
      throw error;
    }
  }

  @Post('upload')
  async uploadSkill(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Body()
    body: {
      files: UploadSkillFileInput[];
    },
    @Req() request: AuthenticatedRequest,
  ): Promise<Skill> {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/skills/upload - Uploading skill',
      { organizationId, spaceId, fileCount: body.files.length },
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
        'POST /organizations/:orgId/spaces/:spaceId/skills/upload - Failed to upload skill',
        { organizationId, spaceId, error: errorMessage },
      );
      throw error;
    }
  }

  @Get(':skillId')
  async getSkillById(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('skillId') skillId: SkillId,
    @Req() request: AuthenticatedRequest,
  ): Promise<GetSkillByIdResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/skills/:skillId - Fetching skill',
      { organizationId, spaceId, skillId },
    );

    try {
      return await this.skillsService.getSkillById(
        skillId,
        organizationId,
        userId,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/spaces/:spaceId/skills/:skillId - Failed to fetch skill',
        { organizationId, spaceId, skillId, error: errorMessage },
      );
      throw error;
    }
  }

  @Put(':skillId')
  async updateSkill(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('skillId') skillId: SkillId,
    @Body()
    body: {
      name: string;
      description: string;
      prompt: string;
      license?: string;
      compatibility?: string;
      metadata?: Record<string, string>;
      allowedTools?: string;
    },
    @Req() request: AuthenticatedRequest,
  ): Promise<Skill> {
    const userId = request.user.userId;

    this.logger.info(
      'PUT /organizations/:orgId/spaces/:spaceId/skills/:skillId - Updating skill',
      { organizationId, spaceId, skillId },
    );

    try {
      return await this.skillsService.updateSkill(
        skillId,
        body,
        organizationId,
        userId,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'PUT /organizations/:orgId/spaces/:spaceId/skills/:skillId - Failed to update skill',
        { organizationId, spaceId, skillId, error: errorMessage },
      );
      throw error;
    }
  }

  @Delete(':skillId')
  async deleteSkill(
    @Param('orgId') organizationId: OrganizationId,
    @Param('skillId') skillId: SkillId,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const userId = request.user.userId;

    this.logger.info(
      'DELETE /organizations/:orgId/spaces/:spaceId/skills/:skillId - Deleting skill',
      { organizationId, skillId },
    );

    try {
      await this.skillsService.deleteSkill(skillId, userId, organizationId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'DELETE /organizations/:orgId/spaces/:spaceId/skills/:skillId - Failed to delete skill',
        { organizationId, skillId, error: errorMessage },
      );
      throw error;
    }
  }

  @Get(':skillId/versions')
  async getSkillVersions(
    @Param('skillId') skillId: SkillId,
  ): Promise<SkillVersion[]> {
    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/skills/:skillId/versions - Fetching skill versions',
      { skillId },
    );

    try {
      return await this.skillsService.getSkillVersionsById(skillId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/spaces/:spaceId/skills/:skillId/versions - Failed to fetch skill versions',
        { skillId, error: errorMessage },
      );
      throw error;
    }
  }
}
