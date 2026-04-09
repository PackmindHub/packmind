import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  OrganizationOnboardingStatus,
  IPullContentResponse,
  InstallPackagesResponse,
  ListPackagesResponse,
  GetPackageSummaryResponse,
  IAccountsPort,
  IDeploymentPort,
  CodingAgent,
  isValidCodingAgent,
  ArtifactVersionEntry,
  ISpacesPort,
  ListUserSpacesResponse,
  PackmindLockFile,
} from '@packmind/types';
import { OrganizationId } from '@packmind/types';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  NoPackageSlugsProvidedError,
  PackagesNotFoundError,
} from '@packmind/deployments';
import { OrganizationAccessGuard } from './guards/organization-access.guard';
import {
  InjectAccountsAdapter,
  InjectDeploymentAdapter,
  InjectSpacesAdapter,
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
    @InjectSpacesAdapter() private readonly spacesAdapter: ISpacesPort,
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
        source: request.clientSource,
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
   * GET /organizations/:orgId/pull?packageSlug=backend&packageSlug=frontend&previousPackageSlug=old-package&agent=claude&agent=cursor
   */
  @Get('pull')
  async pullAllContent(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
    @Query('packageSlug') packageSlug?: string | string[],
    @Query('previousPackageSlug') previousPackageSlug?: string | string[],
    @Query('gitRemoteUrl') gitRemoteUrl?: string,
    @Query('gitBranch') gitBranch?: string,
    @Query('relativePath') relativePath?: string,
    @Query('agent') agent?: string | string[],
    @Query('agentsConfigOverride') agentsConfigOverride?: string,
  ): Promise<IPullContentResponse> {
    const userId = request.user.userId;

    // Normalize packageSlug to array
    const packagesSlugs = packageSlug
      ? Array.isArray(packageSlug)
        ? packageSlug
        : [packageSlug]
      : [];

    // Normalize previousPackageSlug to array
    const previousPackagesSlugs = previousPackageSlug
      ? Array.isArray(previousPackageSlug)
        ? previousPackageSlug
        : [previousPackageSlug]
      : [];

    // Normalize and validate agents to array of valid CodingAgents
    let agents: CodingAgent[] | undefined;
    const agentArray = agent ? (Array.isArray(agent) ? agent : [agent]) : [];
    const validAgents = agentArray.filter(isValidCodingAgent);

    // Log warning for invalid agents
    const invalidAgents = agentArray.filter((a) => !isValidCodingAgent(a));
    if (invalidAgents.length > 0) {
      this.logger.info('Invalid agent values provided, ignoring', {
        invalidAgents,
        validAgents,
      });
    }

    // Set agents if: valid agents exist OR user explicitly overrode config
    // This distinguishes "not configured" (agents=undefined) from "configured but empty" (agents=[])
    if (validAgents.length > 0 || agentsConfigOverride === 'true') {
      agents = validAgents;
    }

    this.logger.info(
      'GET /organizations/:orgId/pull - Pulling all content for organization',
      {
        organizationId,
        userId,
        packagesSlugs,
        previousPackagesSlugs,
        gitRemoteUrl,
        gitBranch,
        relativePath,
        agents,
      },
    );

    try {
      return await this.deploymentAdapter.pullAllContent({
        userId,
        organizationId,
        packagesSlugs,
        previousPackagesSlugs,
        gitRemoteUrl,
        gitBranch,
        relativePath,
        agents,
        source: request.clientSource,
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

      if (error instanceof NoPackageSlugsProvidedError) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof PackagesNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }

  /**
   * Get deployed content for a specific target
   * POST /organizations/:orgId/deployed-content
   */
  @Post('deployed-content')
  async getDeployedContent(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
    @Body()
    body: {
      packagesSlugs?: string[];
      gitRemoteUrl: string;
      gitBranch: string;
      relativePath: string;
      agents?: string[];
    },
  ): Promise<IPullContentResponse> {
    const userId = request.user.userId;

    if (!body.gitRemoteUrl || !body.gitBranch || !body.relativePath) {
      throw new BadRequestException(
        'gitRemoteUrl, gitBranch, and relativePath are required',
      );
    }

    const packagesSlugs = body.packagesSlugs ?? [];

    // Validate agents to array of valid CodingAgents
    let agents: CodingAgent[] | undefined;
    if (body.agents !== undefined) {
      const validAgents = body.agents.filter(isValidCodingAgent);

      // Log warning for invalid agents
      const invalidAgents = body.agents.filter((a) => !isValidCodingAgent(a));
      if (invalidAgents.length > 0) {
        this.logger.info('Invalid agent values provided, ignoring', {
          invalidAgents,
          validAgents,
        });
      }

      agents = validAgents;
    }

    this.logger.info(
      'POST /organizations/:orgId/deployed-content - Getting deployed content for target',
      {
        organizationId,
        userId,
        packagesSlugs,
        gitRemoteUrl: body.gitRemoteUrl,
        gitBranch: body.gitBranch,
        relativePath: body.relativePath,
        agents,
      },
    );

    try {
      return await this.deploymentAdapter.getDeployedContent({
        userId,
        organizationId,
        packagesSlugs,
        gitRemoteUrl: body.gitRemoteUrl,
        gitBranch: body.gitBranch,
        relativePath: body.relativePath,
        agents,
        source: request.clientSource,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/deployed-content - Failed to get deployed content',
        {
          organizationId,
          userId,
          error: errorMessage,
        },
      );

      if (error instanceof NoPackageSlugsProvidedError) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof PackagesNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }

  /**
   * Get rendered content for specific artifact versions from a lock file
   * POST /organizations/:orgId/content-by-versions
   */
  @Post('content-by-versions')
  async getContentByVersions(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
    @Body()
    body: {
      artifacts: ArtifactVersionEntry[];
      agents?: string[];
    },
  ): Promise<IPullContentResponse> {
    const userId = request.user.userId;

    if (!body.artifacts || !Array.isArray(body.artifacts)) {
      throw new BadRequestException('artifacts array is required');
    }

    // Validate agents to array of valid CodingAgents
    let agents: CodingAgent[] | undefined;
    if (body.agents !== undefined) {
      const validAgents = body.agents.filter(isValidCodingAgent);

      // Log warning for invalid agents
      const invalidAgents = body.agents.filter((a) => !isValidCodingAgent(a));
      if (invalidAgents.length > 0) {
        this.logger.info('Invalid agent values provided, ignoring', {
          invalidAgents,
          validAgents,
        });
      }

      agents = validAgents;
    }

    this.logger.info(
      'POST /organizations/:orgId/content-by-versions - Getting content by versions',
      {
        organizationId,
        userId,
        artifactCount: body.artifacts.length,
        agents,
      },
    );

    try {
      return await this.deploymentAdapter.getContentByVersions({
        userId,
        organizationId,
        artifacts: body.artifacts,
        agents,
        source: request.clientSource,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/content-by-versions - Failed to get content by versions',
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
        source: request.clientSource,
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
   * List spaces for the authenticated user within an organization
   * GET /organizations/:orgId/user-spaces
   */
  @Get('user-spaces')
  async listUserSpaces(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListUserSpacesResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/user-spaces - Listing user spaces',
      { organizationId, userId },
    );

    return this.spacesAdapter.listUserSpaces({
      userId,
      organizationId,
    });
  }

  /**
   * Install packages for an organization, respecting space-level access control
   * POST /organizations/:orgId/install
   */
  @Post('install')
  async installPackages(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
    @Body()
    body: {
      packagesSlugs: string[];
      packmindLockFile: PackmindLockFile;
      relativePath?: string;
      agents?: string[];
    },
  ): Promise<InstallPackagesResponse> {
    const userId = request.user.userId;

    if (!body.packagesSlugs || !Array.isArray(body.packagesSlugs)) {
      throw new BadRequestException('packagesSlugs array is required');
    }

    if (!body.packmindLockFile) {
      throw new BadRequestException('packmindLockFile is required');
    }

    let agents: CodingAgent[] | undefined;
    if (body.agents !== undefined) {
      const validAgents = body.agents.filter(isValidCodingAgent);
      const invalidAgents = body.agents.filter((a) => !isValidCodingAgent(a));
      if (invalidAgents.length > 0) {
        this.logger.info('Invalid agent values provided, ignoring', {
          invalidAgents,
          validAgents,
        });
      }
      agents = validAgents;
    }

    this.logger.info(
      'POST /organizations/:orgId/install - Installing packages for organization',
      {
        organizationId,
        userId,
        packagesSlugs: body.packagesSlugs,
        relativePath: body.relativePath,
        agents,
      },
    );

    try {
      return await this.deploymentAdapter.installPackages({
        userId,
        organizationId,
        packagesSlugs: body.packagesSlugs,
        packmindLockFile: body.packmindLockFile,
        relativePath: body.relativePath,
        agents,
        source: request.clientSource,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/install - Failed to install packages',
        {
          organizationId,
          userId,
          error: errorMessage,
        },
      );

      if (error instanceof NoPackageSlugsProvidedError) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof PackagesNotFoundError) {
        throw new NotFoundException(error.message);
      }

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
        source: request.clientSource,
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
}
