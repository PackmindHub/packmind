import { Controller, Get, Query, Req } from '@nestjs/common';
import { GitRepoId } from '@packmind/git';
import { TargetId } from '@packmind/types';
import { AnalyticsService } from './analytics.service';
import { PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  OrganizationUsageAnalytics,
  TargetUsageAnalytics,
  TimePeriod,
} from '../../domain/entities';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly logger: PackmindLogger,
  ) {
    this.logger.info('AnalyticsController initialized');
  }

  @Get('recipes/usage')
  async getRecipeUsageAnalytics(
    @Req() request: AuthenticatedRequest,
    @Query('timePeriod') timePeriod?: TimePeriod,
    @Query('repositoryId') repositoryId?: string,
    @Query('targetId') targetId?: string,
  ): Promise<OrganizationUsageAnalytics | TargetUsageAnalytics> {
    const organizationId = request.organization.id;
    this.logger.info(
      'GET /analytics/recipes/usage - Fetching aggregated recipe usage analytics',
      {
        organizationId,
        repositoryId,
        targetId,
        timePeriod,
      },
    );

    try {
      // If targetId is provided, return target-specific analytics
      if (targetId) {
        // Basic validation for targetId parameter
        if (typeof targetId !== 'string' || targetId.trim() === '') {
          throw new Error(
            'Invalid targetId parameter: must be a non-empty string',
          );
        }

        return await this.analyticsService.getTargetUsageAnalytics({
          targetId: targetId as TargetId,
          timePeriod,
        });
      }

      // Otherwise, return organization/repository analytics as before
      return await this.analyticsService.getRecipeUsageAnalytics({
        organizationId,
        repositoryId: repositoryId as GitRepoId,
        timePeriod,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /analytics/recipes/usage - Failed to fetch recipe usage analytics',
        {
          organizationId,
          repositoryId,
          targetId,
          timePeriod,
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
