import { Injectable } from '@nestjs/common';
import { DeploymentsHexa } from '@packmind/deployments';
import { PackmindLogger } from '@packmind/logger';
import {
  GitRepoId,
  IDeploymentPort,
  OrganizationId,
  TargetId,
} from '@packmind/types';
import { AnalyticsHexa } from '../../AnalyticsHexa';
import {
  OrganizationUsageAnalytics,
  TargetUsageAnalytics,
  TimePeriod,
} from '../../domain/entities';

const origin = 'AnalyticsService';

@Injectable()
export class AnalyticsService {
  private readonly deploymentAdapter: IDeploymentPort;

  constructor(
    private readonly analyticsHexa: AnalyticsHexa,
    private readonly deploymentHexa: DeploymentsHexa,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.deploymentAdapter = this.deploymentHexa.getAdapter();
    this.logger.info('AnalyticsService initialized');
  }

  async getRecipeUsageAnalytics(params: {
    organizationId: OrganizationId;
    repositoryId?: GitRepoId;
    timePeriod?: TimePeriod;
  }): Promise<OrganizationUsageAnalytics> {
    this.logger.info('Getting recipe usage analytics', {
      organizationId: params.organizationId,
      repositoryId: params.repositoryId,
      timePeriod: params.timePeriod,
    });

    try {
      // For repository-level analytics, only pass repositoryId (organization is derived from repo)
      // For organization-level analytics, only pass organizationId
      const serviceParams = params.repositoryId
        ? { repositoryId: params.repositoryId, timePeriod: params.timePeriod }
        : {
            organizationId: params.organizationId,
            timePeriod: params.timePeriod,
          };

      const result =
        await this.getRecipeUsageAnalyticsForOrganization(serviceParams);

      this.logger.info('Recipe usage analytics retrieved successfully', {
        organizationId: params.organizationId,
        repositoryId: params.repositoryId,
        timePeriod: params.timePeriod,
        totalRecipes: result.totalRecipes,
        totalUsage: result.totalUsage,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to get recipe usage analytics', {
        organizationId: params.organizationId,
        repositoryId: params.repositoryId,
        timePeriod: params.timePeriod,
        error: errorMessage,
      });
      throw error;
    }
  }

  async getRecipeUsageAnalyticsForOrganization(params: {
    organizationId?: OrganizationId;
    repositoryId?: GitRepoId;
    timePeriod?: TimePeriod;
  }): Promise<OrganizationUsageAnalytics> {
    return this.analyticsHexa
      .getAdapter()
      .getRecipeUsageAnalytics(params) as Promise<OrganizationUsageAnalytics>;
  }

  async getTargetUsageAnalytics(params: {
    targetId: TargetId;
    timePeriod?: TimePeriod;
  }): Promise<TargetUsageAnalytics> {
    this.logger.info('Getting target usage analytics', {
      targetId: params.targetId,
      timePeriod: params.timePeriod,
    });

    return this.analyticsHexa.getAdapter().getRecipeUsageAnalytics({
      targetId: params.targetId,
      timePeriod: params.timePeriod,
    }) as Promise<TargetUsageAnalytics>;
  }
}
