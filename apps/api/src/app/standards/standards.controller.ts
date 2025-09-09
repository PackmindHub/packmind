import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { StandardsService } from './standards.service';
import { PackmindLogger } from '@packmind/shared';
import { AuthService } from '../auth/auth.service';
import { Request } from 'express';
import { GitRepoId } from '@packmind/git';
import type {
  Standard,
  StandardId,
  StandardVersion,
  StandardVersionId,
} from '@packmind/shared/types';
import { AuthenticatedRequest } from '@packmind/shared-nest';

const origin = 'StandardsController';

@Controller('standards')
export class StandardsController {
  constructor(
    private readonly standardsService: StandardsService,
    private readonly authService: AuthService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('StandardsController initialized');
  }

  @Get()
  async getStandards(
    @Req() request: AuthenticatedRequest,
  ): Promise<Standard[]> {
    const organizationId = request.organization.id;
    this.logger.info('GET /standards - Fetching standards for organization', {
      organizationId,
    });

    try {
      return await this.standardsService.getStandardsByOrganization(
        organizationId,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('GET /standards - Failed to fetch standards', {
        organizationId,
        error: errorMessage,
      });
      throw error;
    }
  }

  @Get(':id')
  async getStandardById(@Param('id') id: StandardId): Promise<Standard> {
    this.logger.info('GET /standards/:id - Fetching standard by ID', {
      standardId: id,
    });

    try {
      const standard = await this.standardsService.getStandardById(id);
      if (!standard) {
        this.logger.warn('GET /standards/:id - Standard not found', {
          standardId: id,
        });
        throw new NotFoundException(`Standard with id ${id} not found`);
      }
      return standard;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('GET /standards/:id - Failed to fetch standard', {
        standardId: id,
        error: errorMessage,
      });
      throw error;
    }
  }

  @Put()
  async createStandard(
    @Body()
    standard: {
      name: string;
      description: string;
      rules: Array<{ content: string }>;
      scope?: string | null;
    },
    @Req() request: AuthenticatedRequest,
  ): Promise<Standard> {
    this.logger.info('PUT /standards - Creating new standard', {
      standardName: standard.name,
      userId: request.user?.userId,
      organizationId: request.organization?.id,
    });

    try {
      // Extract user and organization context from authenticated request
      const organizationId = request.organization?.id;
      const userId = request.user?.userId;

      if (!organizationId || !userId) {
        this.logger.error(
          'PUT /standards - Missing user or organization context',
          {
            userId,
            organizationId,
          },
        );
        throw new BadRequestException('User authentication required');
      }

      // Validate request body
      if (!standard.name || typeof standard.name !== 'string') {
        this.logger.error('PUT /standards - Standard name is required');
        throw new BadRequestException('Standard name is required');
      }

      if (!standard.description || typeof standard.description !== 'string') {
        this.logger.error('PUT /standards - Standard description is required');
        throw new BadRequestException('Standard description is required');
      }

      if (!standard.rules || !Array.isArray(standard.rules)) {
        this.logger.error('PUT /standards - Rules array is required');
        throw new BadRequestException('Rules array is required');
      }

      // Validate each rule
      for (let i = 0; i < standard.rules.length; i++) {
        const rule = standard.rules[i];
        if (!rule.content || typeof rule.content !== 'string') {
          this.logger.error(`PUT /standards - Rule ${i} content is required`);
          throw new BadRequestException(`Rule ${i} content is required`);
        }
      }

      return await this.standardsService.createStandard(
        standard,
        organizationId,
        userId,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('PUT /standards - Failed to create standard', {
        standardName: standard.name,
        error: errorMessage,
      });
      throw error;
    }
  }

  @Post('/deploy')
  async deployStandardsToGit(
    @Body()
    body: {
      standardVersionIds: StandardVersionId[];
      repositoryIds: GitRepoId[];
    },
    @Req() request: Request,
  ): Promise<void> {
    this.logger.info('POST /standards/deploy - Deploying standards to Git', {
      standardVersionIds: body.standardVersionIds,
      repositoryIds: body.repositoryIds,
    });

    try {
      // Validate request body
      if (
        !body.standardVersionIds ||
        !Array.isArray(body.standardVersionIds) ||
        body.standardVersionIds.length === 0
      ) {
        this.logger.error(
          'POST /standards/deploy - Standard Version IDs array is required',
        );
        throw new BadRequestException('Standard Version IDs array is required');
      }

      if (
        !body.repositoryIds ||
        !Array.isArray(body.repositoryIds) ||
        body.repositoryIds.length === 0
      ) {
        this.logger.error(
          'POST /standards/deploy - Repository IDs array is required',
        );
        throw new BadRequestException('Repository IDs array is required');
      }

      const accessToken = request.cookies?.auth_token;
      const me = await this.authService.getMe(accessToken);
      if (!me.authenticated || !me.user) {
        this.logger.error('POST /standards/deploy - User not authenticated');
        throw new BadRequestException('User not authenticated');
      }

      await this.standardsService.deployStandardsToGit({
        standardVersionIds: body.standardVersionIds,
        gitRepoIds: body.repositoryIds,
        userId: me.user.id,
        organizationId: me.user.organizationId,
      });

      this.logger.info(
        'POST /standards/deploy - Standards deployed to Git successfully',
        {
          standardVersionIds: body.standardVersionIds,
          repositoryIds: body.repositoryIds,
          authorId: me.user.id,
          organizationId: me.user.organizationId,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /standards/deploy - Failed to deploy standards to Git',
        {
          standardVersionIds: body.standardVersionIds,
          repositoryIds: body.repositoryIds,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Post(':id')
  async updateStandard(
    @Param('id') id: StandardId,
    @Body()
    standard: {
      name: string;
      description: string;
      rules: Array<{ content: string }>;
      scope?: string | null;
    },
    @Req() request: AuthenticatedRequest,
  ): Promise<Standard> {
    this.logger.info('POST /standards/:id - Updating standard', {
      standardId: id,
      standardName: standard.name,
      userId: request.user?.userId,
      organizationId: request.organization?.id,
    });

    try {
      // Extract user and organization context from authenticated request
      const organizationId = request.organization?.id;
      const userId = request.user?.userId;

      if (!organizationId || !userId) {
        this.logger.error(
          'POST /standards/:id - Missing user or organization context',
          {
            standardId: id,
            userId,
            organizationId,
          },
        );
        throw new BadRequestException('User authentication required');
      }

      // Validate request body
      if (!standard.name || typeof standard.name !== 'string') {
        this.logger.error('POST /standards/:id - Standard name is required');
        throw new BadRequestException('Standard name is required');
      }

      if (!standard.description || typeof standard.description !== 'string') {
        this.logger.error(
          'POST /standards/:id - Standard description is required',
        );
        throw new BadRequestException('Standard description is required');
      }

      if (!standard.rules || !Array.isArray(standard.rules)) {
        this.logger.error('POST /standards/:id - Rules array is required');
        throw new BadRequestException('Rules array is required');
      }

      // Validate each rule
      for (let i = 0; i < standard.rules.length; i++) {
        const rule = standard.rules[i];
        if (!rule.content || typeof rule.content !== 'string') {
          this.logger.error(
            `POST /standards/:id - Rule ${i} content is required`,
          );
          throw new BadRequestException(`Rule ${i} content is required`);
        }
      }

      return await this.standardsService.updateStandard(
        id,
        standard,
        organizationId,
        userId,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('POST /standards/:id - Failed to update standard', {
        standardId: id,
        standardName: standard.name,
        error: errorMessage,
      });
      throw error;
    }
  }

  @Get(':id/versions')
  async getStandardVersionsById(
    @Param('id') id: StandardId,
  ): Promise<StandardVersion[]> {
    this.logger.info(
      'GET /standards/:id/versions - Fetching standard versions',
      {
        standardId: id,
      },
    );

    try {
      const versions = await this.standardsService.getStandardVersionsById(id);
      if (!versions || versions.length === 0) {
        this.logger.warn('GET /standards/:id/versions - No versions found', {
          standardId: id,
        });
        throw new NotFoundException(
          `No versions found for standard with id ${id}`,
        );
      }
      return versions;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /standards/:id/versions - Failed to fetch standard versions',
        { standardId: id, error: errorMessage },
      );
      throw error;
    }
  }

  @Post(':versionId/deploy')
  async deployStandardToGit(
    @Param('versionId') versionId: StandardVersionId,
    @Body() body: { repositoryId: GitRepoId },
    @Req() request: Request,
  ): Promise<void> {
    this.logger.info(
      'POST /standards/:versionId/deploy - Deploying standard to Git',
      {
        standardVersionId: versionId,
        repositoryId: body.repositoryId,
      },
    );

    try {
      // Validate repository ID
      if (!body.repositoryId) {
        this.logger.error(
          'POST /standards/:versionId/deploy - Repository ID is required',
          {
            standardVersionId: versionId,
          },
        );
        throw new BadRequestException('Repository ID is required');
      }

      const accessToken = request.cookies?.auth_token;
      const me = await this.authService.getMe(accessToken);
      if (!me.authenticated || !me.user) {
        this.logger.error(
          'POST /standards/:versionId/deploy - User not authenticated',
          {
            standardVersionId: versionId,
          },
        );
        throw new BadRequestException('User not authenticated');
      }

      await this.standardsService.deployStandardsToGit({
        standardVersionIds: [versionId],
        gitRepoIds: [body.repositoryId],
        userId: me.user.id,
        organizationId: me.user.organizationId,
      });

      this.logger.info(
        'POST /standards/:versionId/deploy - Standard deployed to Git successfully',
        {
          standardVersionId: versionId,
          repositoryId: body.repositoryId,
          authorId: me.user.id,
          organizationId: me.user.organizationId,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /standards/:versionId/deploy - Failed to deploy standard to Git',
        {
          standardVersionId: versionId,
          repositoryId: body.repositoryId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Delete(':id')
  async deleteStandard(
    @Param('id') id: StandardId,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    this.logger.info('DELETE /standards/:id - Deleting standard', {
      standardId: id,
    });

    try {
      await this.standardsService.deleteStandard(id, request.user.userId);
      this.logger.info(
        'DELETE /standards/:id - Standard deleted successfully',
        {
          standardId: id,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('DELETE /standards/:id - Failed to delete standard', {
        standardId: id,
        error: errorMessage,
      });
      throw error;
    }
  }

  @Delete()
  async deleteStandardsBatch(
    @Body() body: { standardIds: StandardId[] },
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    try {
      if (!body.standardIds || !Array.isArray(body.standardIds)) {
        throw new BadRequestException('standardIds must be an array');
      }

      if (body.standardIds.length === 0) {
        throw new BadRequestException('standardIds array cannot be empty');
      }

      this.logger.info('DELETE /standards - Deleting standards in batch', {
        standardIds: body.standardIds,
        count: body.standardIds.length,
      });

      await this.standardsService.deleteStandardsBatch(
        body.standardIds,
        request.user.userId,
      );
      this.logger.info(
        'DELETE /standards - Standards deleted successfully in batch',
        {
          count: body.standardIds.length,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'DELETE /standards - Failed to delete standards in batch',
        {
          standardIds: body?.standardIds || 'undefined',
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
