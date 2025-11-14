import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  OrganizationOnboardingStatus,
  IPullContentResponse,
  IAccountsPort,
  IDeploymentPort,
} from '@packmind/types';
import { OrganizationId } from '@packmind/types';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { OrganizationAccessGuard } from './guards/organization-access.guard';
import {
  InjectAccountsAdapter,
  InjectDeploymentAdapter,
} from '../shared/HexaInjection';

const origin = 'OrganizationsController';

/**
 * Root controller for organization-scoped routes
 * Actual path: /organizations/:orgId (inherited via RouterModule in AppModule)
 *
 * This controller serves as the entry point for all organization-scoped resources.
 * The path is configured in AppModule via RouterModule to avoid circular dependencies.
 * Nested modules (recipes, standards, etc.) are mounted as children in the RouterModule config.
 */
@Controller()
@UseGuards(OrganizationAccessGuard)
export class OrganizationsController {
  constructor(
    @InjectAccountsAdapter() private readonly accountsAdapter: IAccountsPort,
    @InjectDeploymentAdapter()
    private readonly deploymentAdapter: IDeploymentPort,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('OrganizationsController initialized');
  }

  /**
   * Health check endpoint for organization-scoped routing
   * GET /organizations/:orgId
   */
  @Get()
  async getOrganizationInfo(
    @Param('orgId') orgId: OrganizationId,
  ): Promise<{ message: string; organizationId: OrganizationId }> {
    this.logger.info('GET /organizations/:orgId - Organization info', {
      organizationId: orgId,
    });

    return {
      message: 'Organization routing active',
      organizationId: orgId,
    };
  }

  /**
   * Get onboarding status for an organization
   * GET /organizations/:orgId/onboarding-status
   */
  @Get('onboarding-status')
  async getOnboardingStatus(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
  ): Promise<OrganizationOnboardingStatus> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/onboarding-status - Fetching onboarding status',
      {
        organizationId,
        userId,
      },
    );

    try {
      return await this.accountsAdapter.getOrganizationOnboardingStatus({
        userId,
        organizationId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/onboarding-status - Failed to fetch onboarding status',
        {
          organizationId,
          userId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Pull all content (recipes and standards) for an organization
   * GET /organizations/:orgId/pull?packageSlug=backend&packageSlug=frontend
   */
  @Get('pull')
  async pullAllContent(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
    @Query('packageSlug') packageSlug?: string | string[],
  ): Promise<IPullContentResponse> {
    const userId = request.user.userId;

    // Normalize packageSlug to array
    const packagesSlugs = packageSlug
      ? Array.isArray(packageSlug)
        ? packageSlug
        : [packageSlug]
      : [];

    this.logger.info(
      'GET /organizations/:orgId/pull - Pulling all content for organization',
      {
        organizationId,
        userId,
        packagesSlugs,
      },
    );

    try {
      return await this.deploymentAdapter.pullAllContent({
        userId,
        organizationId,
        packagesSlugs,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/pull - Failed to pull all content',
        {
          organizationId,
          userId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
