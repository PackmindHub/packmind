import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  OrganizationOnboardingStatus,
  IPullAllContentResponse,
} from '@packmind/types';
import { AccountsHexa, OrganizationId } from '@packmind/accounts';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { OrganizationAccessGuard } from './guards/organization-access.guard';
import { DeploymentsHexa } from '@packmind/deployments';

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
    private readonly accountsHexa: AccountsHexa,
    private readonly deploymentsHexa: DeploymentsHexa,
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
      return await this.accountsHexa.getOrganizationOnboardingStatus({
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
   * GET /organizations/:orgId/pull
   */
  @Get('pull')
  async pullAllContent(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
  ): Promise<IPullAllContentResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/pull - Pulling all content for organization',
      {
        organizationId,
        userId,
      },
    );

    try {
      return await this.deploymentsHexa
        .getDeploymentsUseCases()
        .pullAllContent({
          userId,
          organizationId,
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
