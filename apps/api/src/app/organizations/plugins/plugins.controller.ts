import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { PackagesNotFoundError } from '@packmind/deployments';
import {
  OrganizationId,
  RenderPackageAsPluginCommand,
  RenderPackageAsPluginMode,
  RenderPackageAsPluginResponse,
  TrackPluginDeletedCommand,
  TrackPluginDeletedResponse,
} from '@packmind/types';
import { OrganizationAccessGuard } from '../guards/organization-access.guard';
import { PluginsService } from './plugins.service';

const origin = 'OrganizationPluginsController';

@Controller()
@UseGuards(OrganizationAccessGuard)
export class PluginsController {
  constructor(
    private readonly pluginsService: PluginsService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('OrganizationPluginsController initialized');
  }

  @Post('render')
  async render(
    @Param('orgId') organizationId: OrganizationId,
    @Body()
    body: {
      packageSlug: string;
      mode: RenderPackageAsPluginMode;
      pluginRoot: string;
      pluginName: string;
      gitRemoteUrl?: string;
      gitBranch?: string;
    },
    @Req() request: AuthenticatedRequest,
  ): Promise<RenderPackageAsPluginResponse> {
    this.logger.info(
      'POST /organizations/:orgId/plugins/render - Rendering package as plugin',
      {
        organizationId,
        packageSlug: body.packageSlug,
        mode: body.mode,
      },
    );

    try {
      const command: RenderPackageAsPluginCommand = {
        userId: request.user.userId,
        organizationId,
        packageSlug: body.packageSlug,
        mode: body.mode,
        pluginRoot: body.pluginRoot,
        pluginName: body.pluginName,
        gitRemoteUrl: body.gitRemoteUrl,
        gitBranch: body.gitBranch,
      };

      const response = await this.pluginsService.renderPlugin(command);

      this.logger.info(
        'POST /organizations/:orgId/plugins/render - Package rendered successfully',
        {
          organizationId,
          packageSlug: body.packageSlug,
          fileCount: response.files.length,
          skippedStandardsCount: response.skippedStandardsCount,
        },
      );

      return response;
    } catch (error) {
      if (error instanceof PackagesNotFoundError) {
        throw new NotFoundException(error.message);
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/plugins/render - Failed to render package as plugin',
        {
          organizationId,
          packageSlug: body.packageSlug,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Post('track-deleted')
  async trackDeleted(
    @Param('orgId') organizationId: OrganizationId,
    @Body() body: { packageSlug: string; gitRemoteUrl?: string },
    @Req() request: AuthenticatedRequest,
  ): Promise<TrackPluginDeletedResponse> {
    this.logger.info(
      'POST /organizations/:orgId/plugins/track-deleted - Tracking plugin deletion',
      {
        organizationId,
        packageSlug: body.packageSlug,
      },
    );

    try {
      const command: TrackPluginDeletedCommand = {
        userId: request.user.userId,
        organizationId,
        packageSlug: body.packageSlug,
        gitRemoteUrl: body.gitRemoteUrl,
      };

      const response = await this.pluginsService.trackPluginDeleted(command);

      this.logger.info(
        'POST /organizations/:orgId/plugins/track-deleted - Plugin deletion tracked successfully',
        {
          organizationId,
          packageSlug: body.packageSlug,
          tracked: response.tracked,
        },
      );

      return response;
    } catch (error) {
      if (error instanceof PackagesNotFoundError) {
        throw new NotFoundException(error.message);
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/plugins/track-deleted - Failed to track plugin deletion',
        {
          organizationId,
          packageSlug: body.packageSlug,
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
