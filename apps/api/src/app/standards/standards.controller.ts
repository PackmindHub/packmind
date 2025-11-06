import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { StandardsService } from './standards.service';
import { PackmindLogger } from '@packmind/logger';
import { AuthService } from '../auth/auth.service';
import { Request } from 'express';
import type {
  StandardId,
  StandardVersion,
  StandardVersionId,
  TargetId,
} from '@packmind/types';
import { AuthenticatedRequest } from '@packmind/shared-nest';

const origin = 'StandardsController';

@Controller()
export class StandardsController {
  constructor(
    private readonly standardsService: StandardsService,
    private readonly authService: AuthService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('StandardsController initialized');
  }

  @Post('standards/deploy')
  async deployStandardsToGit(
    @Body()
    body: {
      standardVersionIds: StandardVersionId[];
      targetIds: TargetId[];
    },
    @Req() request: Request,
  ): Promise<void> {
    this.logger.info('POST /standards/deploy - Deploying standards to Git', {
      standardVersionIds: body.standardVersionIds,
      targetIds: body.targetIds,
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
        !body.targetIds ||
        !Array.isArray(body.targetIds) ||
        body.targetIds.length === 0
      ) {
        this.logger.error(
          'POST /standards/deploy - Target IDs array is required',
        );
        throw new BadRequestException('Target IDs array is required');
      }

      const accessToken = request.cookies?.auth_token;
      const me = await this.authService.getMe(accessToken);
      if (!me.authenticated || !me.user || !me.organization) {
        this.logger.error('POST /standards/deploy - User not authenticated');
        throw new BadRequestException('User not authenticated');
      }

      await this.standardsService.deployStandardsToGit({
        standardVersionIds: body.standardVersionIds,
        targetIds: body.targetIds,
        userId: me.user.id,
        organizationId: me.organization.id,
      });

      this.logger.info(
        'POST /standards/deploy - Standards deployed to Git successfully',
        {
          standardVersionIds: body.standardVersionIds,
          targetIds: body.targetIds,
          authorId: me.user.id,
          organizationId: me.organization.id,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /standards/deploy - Failed to deploy standards to Git',
        {
          standardVersionIds: body.standardVersionIds,
          targetIds: body.targetIds,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('standards/:id/versions')
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

  @Post('standards/:versionId/deploy')
  async deployStandardToGit(
    @Param('versionId') versionId: StandardVersionId,
    @Body() body: { targetId: TargetId },
    @Req() request: Request,
  ): Promise<void> {
    this.logger.info(
      'POST /standards/:versionId/deploy - Deploying standard to Git',
      {
        standardVersionId: versionId,
        targetId: body.targetId,
      },
    );

    try {
      // Validate target ID
      if (!body.targetId) {
        this.logger.error(
          'POST /standards/:versionId/deploy - Target ID is required',
          {
            standardVersionId: versionId,
          },
        );
        throw new BadRequestException('Target ID is required');
      }

      const accessToken = request.cookies?.auth_token;
      const me = await this.authService.getMe(accessToken);
      if (!me.authenticated || !me.user || !me.organization) {
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
        targetIds: [body.targetId],
        userId: me.user.id,
        organizationId: me.organization.id,
      });

      this.logger.info(
        'POST /standards/:versionId/deploy - Standard deployed to Git successfully',
        {
          standardVersionId: versionId,
          targetId: body.targetId,
          authorId: me.user.id,
          organizationId: me.organization.id,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /standards/:versionId/deploy - Failed to deploy standard to Git',
        {
          standardVersionId: versionId,
          targetId: body.targetId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Delete('standards/:id')
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

  @Delete('standards')
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
