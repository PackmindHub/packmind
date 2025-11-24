import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  DeleteTargetResponse,
  GitRepoId,
  OrganizationId,
  Target,
  TargetId,
  TargetWithRepository,
  GetTargetsByOrganizationCommand,
  AddTargetCommand,
  UpdateTargetCommand,
  DeleteTargetCommand,
} from '@packmind/types';
import { TargetsService } from './targets.service';
import { PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';

const origin = 'OrganizationTargetsController';

@Controller()
@UseGuards(OrganizationAccessGuard)
export class TargetsController {
  constructor(
    private readonly targetsService: TargetsService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('OrganizationTargetsController initialized');
  }

  @Get()
  async getTargetsByOrganization(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
  ): Promise<TargetWithRepository[]> {
    this.logger.info(
      'GET /organizations/:orgId/deployments/targets - Fetching targets by organization ID',
      {
        organizationId,
      },
    );

    try {
      const command: GetTargetsByOrganizationCommand = {
        userId: request.user.userId,
        organizationId,
      };

      const targets =
        await this.targetsService.getTargetsByOrganization(command);

      this.logger.info(
        'GET /organizations/:orgId/deployments/targets - Targets fetched successfully',
        {
          organizationId,
          count: targets.length,
        },
      );

      return targets;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/deployments/targets - Failed to fetch targets',
        {
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Post()
  async addTarget(
    @Param('orgId') organizationId: OrganizationId,
    @Body() body: { name: string; path: string; gitRepoId: GitRepoId },
    @Req() request: AuthenticatedRequest,
  ): Promise<Target> {
    this.logger.info(
      'POST /organizations/:orgId/deployments/targets - Adding new target',
      {
        organizationId,
        name: body.name,
        path: body.path,
        gitRepoId: body.gitRepoId,
      },
    );

    try {
      const command: AddTargetCommand = {
        userId: request.user.userId,
        organizationId,
        name: body.name,
        path: body.path,
        gitRepoId: body.gitRepoId,
      };

      const target = await this.targetsService.addTarget(command);

      this.logger.info(
        'POST /organizations/:orgId/deployments/targets - Target added successfully',
        {
          organizationId,
          targetId: target.id,
          name: target.name,
          path: target.path,
          gitRepoId: target.gitRepoId,
        },
      );

      return target;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/deployments/targets - Failed to add target',
        {
          organizationId,
          name: body.name,
          path: body.path,
          gitRepoId: body.gitRepoId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Patch(':targetId')
  async updateTarget(
    @Param('orgId') organizationId: OrganizationId,
    @Param('targetId') targetId: TargetId,
    @Body() body: { name: string; path: string },
    @Req() request: AuthenticatedRequest,
  ): Promise<Target> {
    this.logger.info(
      'PATCH /organizations/:orgId/deployments/targets/:targetId - Updating target',
      {
        organizationId,
        targetId,
        name: body.name,
        path: body.path,
      },
    );

    try {
      const command: UpdateTargetCommand = {
        userId: request.user.userId,
        organizationId,
        targetId,
        name: body.name,
        path: body.path,
      };

      const target = await this.targetsService.updateTarget(command);

      this.logger.info(
        'PATCH /organizations/:orgId/deployments/targets/:targetId - Target updated successfully',
        {
          organizationId,
          targetId: target.id,
          name: target.name,
          path: target.path,
        },
      );

      return target;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'PATCH /organizations/:orgId/deployments/targets/:targetId - Failed to update target',
        {
          organizationId,
          targetId,
          name: body.name,
          path: body.path,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Delete(':targetId')
  async deleteTarget(
    @Param('orgId') organizationId: OrganizationId,
    @Param('targetId') targetId: TargetId,
    @Req() request: AuthenticatedRequest,
  ): Promise<DeleteTargetResponse> {
    this.logger.info(
      'DELETE /organizations/:orgId/deployments/targets/:targetId - Deleting target',
      {
        organizationId,
        targetId,
      },
    );

    try {
      const command: DeleteTargetCommand = {
        userId: request.user.userId,
        organizationId,
        targetId,
      };

      const response = await this.targetsService.deleteTarget(command);

      this.logger.info(
        'DELETE /organizations/:orgId/deployments/targets/:targetId - Target deleted successfully',
        {
          organizationId,
          targetId,
          success: response.success,
        },
      );

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'DELETE /organizations/:orgId/deployments/targets/:targetId - Failed to delete target',
        {
          organizationId,
          targetId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
