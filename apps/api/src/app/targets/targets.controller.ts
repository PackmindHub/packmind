import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { GitRepoId } from '@packmind/git';
import { OrganizationId } from '@packmind/types';
import {
  Target,
  TargetWithRepository,
  TargetId,
  DeleteTargetResponse,
} from '@packmind/types';
import { TargetsService } from './targets.service';
import { PackmindLogger } from '@packmind/logger';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedRequest } from '@packmind/node-utils';

const origin = 'TargetsController';

@Controller('targets')
export class TargetsController {
  constructor(
    private readonly targetsService: TargetsService,
    private readonly authService: AuthService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('TargetsController initialized');
  }

  @Get('git-repo/:gitRepoId')
  async getTargetsByGitRepo(
    @Param('gitRepoId') gitRepoId: GitRepoId,
    @Req() request: AuthenticatedRequest,
  ): Promise<Target[]> {
    this.logger.info(
      'GET /targets/git-repo/:gitRepoId - Fetching targets by git repository ID (branch-specific)',
      {
        gitRepoId,
      },
    );

    try {
      const targets = await this.targetsService.getTargetsByGitRepo(
        this.authService.makePackmindCommand(request, { gitRepoId }),
      );

      this.logger.info(
        'GET /targets/git-repo/:gitRepoId - Targets fetched successfully',
        {
          gitRepoId,
          count: targets.length,
        },
      );

      return targets;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /targets/git-repo/:gitRepoId - Failed to fetch targets',
        {
          gitRepoId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('repository/:owner/:repo')
  async getTargetsByRepository(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<TargetWithRepository[]> {
    this.logger.info(
      'GET /targets/repository/:owner/:repo - Fetching targets by repository name (all branches)',
      {
        owner,
        repo,
      },
    );

    try {
      const targets = await this.targetsService.getTargetsByRepository(
        this.authService.makePackmindCommand(request, { owner, repo }),
      );

      this.logger.info(
        'GET /targets/repository/:owner/:repo - Targets fetched successfully',
        {
          owner,
          repo,
          count: targets.length,
        },
      );

      return targets;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /targets/repository/:owner/:repo - Failed to fetch targets',
        {
          owner,
          repo,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('organization/:organizationId')
  async getTargetsByOrganization(
    @Param('organizationId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
  ): Promise<TargetWithRepository[]> {
    this.logger.info(
      'GET /targets/organization/:organizationId - Fetching targets by organization ID',
      {
        organizationId,
      },
    );

    try {
      const targets = await this.targetsService.getTargetsByOrganization(
        this.authService.makePackmindCommand(request, { organizationId }),
      );

      this.logger.info(
        'GET /targets/organization/:organizationId - Targets fetched successfully',
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
        'GET /targets/organization/:organizationId - Failed to fetch targets',
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
    @Body() body: { name: string; path: string; gitRepoId: GitRepoId },
    @Req() request: AuthenticatedRequest,
  ): Promise<Target> {
    this.logger.info('POST /targets - Adding new target', {
      name: body.name,
      path: body.path,
      gitRepoId: body.gitRepoId,
    });

    try {
      const target = await this.targetsService.addTarget(
        this.authService.makePackmindCommand(request, body),
      );

      this.logger.info('POST /targets - Target added successfully', {
        targetId: target.id,
        name: target.name,
        path: target.path,
        gitRepoId: target.gitRepoId,
      });

      return target;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('POST /targets - Failed to add target', {
        name: body.name,
        path: body.path,
        gitRepoId: body.gitRepoId,
        error: errorMessage,
      });
      throw error;
    }
  }

  @Put(':targetId')
  async updateTarget(
    @Param('targetId') targetId: TargetId,
    @Body() body: { name: string; path: string },
    @Req() request: AuthenticatedRequest,
  ): Promise<Target> {
    this.logger.info('PUT /targets/:targetId - Updating target', {
      targetId,
      name: body.name,
      path: body.path,
    });

    try {
      const target = await this.targetsService.updateTarget(
        this.authService.makePackmindCommand(request, {
          targetId,
          name: body.name,
          path: body.path,
        }),
      );

      this.logger.info('PUT /targets/:targetId - Target updated successfully', {
        targetId: target.id,
        name: target.name,
        path: target.path,
      });

      return target;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('PUT /targets/:targetId - Failed to update target', {
        targetId,
        name: body.name,
        path: body.path,
        error: errorMessage,
      });
      throw error;
    }
  }

  @Delete(':targetId')
  async deleteTarget(
    @Param('targetId') targetId: TargetId,
    @Req() request: AuthenticatedRequest,
  ): Promise<DeleteTargetResponse> {
    this.logger.info('DELETE /targets/:targetId - Deleting target', {
      targetId,
    });

    try {
      const response = await this.targetsService.deleteTarget(
        this.authService.makePackmindCommand(request, { targetId }),
      );

      this.logger.info(
        'DELETE /targets/:targetId - Target deleted successfully',
        {
          targetId,
          success: response.success,
        },
      );

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('DELETE /targets/:targetId - Failed to delete target', {
        targetId,
        error: errorMessage,
      });
      throw error;
    }
  }
}
