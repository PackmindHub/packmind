import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  OrganizationOnboardingStatus,
  IPullContentResponse,
  ListPackagesResponse,
  GetPackageSummaryResponse,
  IAccountsPort,
  IDeploymentPort,
  ILearningsPort,
  GetRagLabConfigurationResponse,
  UpdateRagLabConfigurationCommand,
  UpdateRagLabConfigurationResponse,
  TriggerFullReembeddingResponse,
} from '@packmind/types';
import { OrganizationId } from '@packmind/types';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { PackagesNotFoundError } from '@packmind/deployments';
import { OrganizationAccessGuard } from './guards/organization-access.guard';
import {
  InjectAccountsAdapter,
  InjectDeploymentAdapter,
  InjectLearningsAdapter,
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
    @InjectLearningsAdapter()
    private readonly learningsAdapter: ILearningsPort,
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

      if (error instanceof PackagesNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }

  /**
   * List all packages for an organization
   * GET /organizations/:orgId/packages
   */
  @Get('packages')
  async listPackages(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListPackagesResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/packages - Listing all packages for organization',
      {
        organizationId,
        userId,
      },
    );

    try {
      return await this.deploymentAdapter.listPackages({
        userId,
        organizationId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/packages - Failed to list packages',
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
   * Get a package summary by slug
   * GET /organizations/:orgId/packages/:slug
   */
  @Get('packages/:slug')
  async getPackageSummary(
    @Param('orgId') organizationId: OrganizationId,
    @Param('slug') slug: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<GetPackageSummaryResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/packages/:slug - Getting package summary',
      {
        organizationId,
        userId,
        slug,
      },
    );

    try {
      return await this.deploymentAdapter.getPackageSummary({
        userId,
        organizationId,
        slug,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/packages/:slug - Failed to get package summary',
        {
          organizationId,
          userId,
          slug,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Get RAG Lab configuration for an organization
   * GET /organizations/:orgId/rag-lab/configuration
   */
  @Get('rag-lab/configuration')
  async getRagLabConfiguration(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
  ): Promise<GetRagLabConfigurationResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/rag-lab/configuration - Fetching RAG Lab configuration',
      {
        organizationId,
        userId,
      },
    );

    try {
      return await this.learningsAdapter.getRagLabConfiguration({
        organizationId,
        userId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/rag-lab/configuration - Failed to fetch RAG Lab configuration',
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
   * Update RAG Lab configuration for an organization
   * PUT /organizations/:orgId/rag-lab/configuration
   */
  @Put('rag-lab/configuration')
  async updateRagLabConfiguration(
    @Param('orgId') organizationId: OrganizationId,
    @Body() body: UpdateRagLabConfigurationCommand,
    @Req() request: AuthenticatedRequest,
  ): Promise<UpdateRagLabConfigurationResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'PUT /organizations/:orgId/rag-lab/configuration - Updating RAG Lab configuration',
      {
        organizationId,
        userId,
        embeddingModel: body.embeddingModel,
        embeddingDimensions: body.embeddingDimensions,
      },
    );

    try {
      return await this.learningsAdapter.updateRagLabConfiguration({
        ...body,
        organizationId,
        userId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'PUT /organizations/:orgId/rag-lab/configuration - Failed to update RAG Lab configuration',
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
   * Trigger full reembedding for all artifacts in the organization
   * POST /organizations/:orgId/rag-lab/trigger-full-reembedding
   */
  @Post('rag-lab/trigger-full-reembedding')
  async triggerFullReembedding(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
  ): Promise<TriggerFullReembeddingResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/rag-lab/trigger-full-reembedding - Triggering full reembedding',
      {
        organizationId,
        userId,
      },
    );

    try {
      return await this.learningsAdapter.triggerFullReembedding({
        organizationId,
        userId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/rag-lab/trigger-full-reembedding - Failed to trigger full reembedding',
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
