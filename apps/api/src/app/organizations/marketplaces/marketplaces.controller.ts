import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  AuthenticatedRequest,
  OrganizationAdminRequiredError,
} from '@packmind/node-utils';
import {
  GitProviderId,
  GitProviderMissingTokenError,
  GitProviderNotFoundError,
  GitProviderOrganizationMismatchError,
  GitProviderTokenInvalidError,
  GitRepoAlreadyLinkedAsStandardError,
  IDeploymentPort,
  LinkMarketplaceCommand,
  LinkMarketplaceResponse,
  GetMarketplaceDistributionChangesCommand,
  GetMarketplaceDistributionChangesResponse,
  ListMarketplaceDistributionsCommand,
  ListMarketplaceDistributionsResponse,
  ListMarketplacesCommand,
  ListMarketplacesResponse,
  ListMarketplacePluginInstallsCommand,
  ListMarketplacePluginInstallsResponse,
  MarketplaceAlreadyLinkedError,
  MarketplaceDescriptorBadFormatError,
  MarketplaceDescriptorNotFoundError,
  MarketplaceDescriptorParseError,
  MarketplaceDistributionId,
  MarketplaceId,
  MarketplaceNotFoundError,
  MarketplacePluginNameConflictError,
  MarketplaceUrlNotReachableError,
  MarkPluginForRemovalCommand,
  MarkPluginForRemovalResponse,
  SyncMarketplaceNowCommand,
  SyncMarketplaceNowResponse,
  OrganizationId,
  PackageId,
  PluginDistributionInvalidStateError,
  PluginDistributionNotFoundError,
  PublishPackageOnMarketplaceCommand,
  PublishPackageOnMarketplaceResponse,
  UnknownMarketplaceDescriptorError,
  UnlinkMarketplaceCommand,
  UnlinkMarketplaceResponse,
  ValidateMarketplaceUrlCommand,
  ValidateMarketplaceUrlResponse,
} from '@packmind/types';
import { OrganizationAccessGuard } from '../guards/organization-access.guard';
import { InjectDeploymentAdapter } from '../../shared/HexaInjection';
import { LinkMarketplaceBodyDto } from './dto/LinkMarketplaceBody.dto';
import { PublishPackageOnMarketplaceBodyDto } from './dto/PublishPackageOnMarketplaceBody.dto';
import { ValidateMarketplaceUrlQueryDto } from './dto/ValidateMarketplaceUrlQuery.dto';

const origin = 'OrganizationMarketplacesController';

/**
 * User-facing messages for errors whose underlying domain message embeds an
 * internal identifier (a provider/marketplace UUID). The raw `error.message`
 * is still logged for diagnostics, but the HTTP response must never leak a
 * UUID to the end user.
 */
const USER_FACING_ERROR_MESSAGE = {
  gitProviderNotFound: 'The selected Git provider could not be found.',
  gitProviderOrganizationMismatch:
    'The selected Git provider does not belong to your organization.',
  gitProviderMissingToken:
    'The selected Git provider has no access token configured. Connect it in your Git settings and try again.',
  marketplaceNotFound:
    'The marketplace could not be found. It may have already been unlinked.',
} as const;

/**
 * Build a user-facing message for `PluginDistributionNotFoundError` whose
 * underlying message embeds raw UUIDs (distributionId, packageId,
 * marketplaceId). UUIDs are masked to their first 6 characters per
 * `standard-compliance-logging-personal-information.md`.
 */
function pluginDistributionNotFoundMessage(
  error: PluginDistributionNotFoundError,
): string {
  if ('distributionId' in error.identifier) {
    return `The marketplace plugin distribution "${maskIdentifier(
      error.identifier.distributionId,
    )}" could not be found. It may have already been removed.`;
  }
  return `No active marketplace plugin distribution was found for package "${maskIdentifier(
    error.identifier.packageId,
  )}" on marketplace "${maskIdentifier(error.identifier.marketplaceId)}".`;
}

/**
 * Build a user-facing message for `PluginDistributionInvalidStateError` so the
 * distribution UUID does not leak to the HTTP client.
 */
function pluginDistributionInvalidStateMessage(
  error: PluginDistributionInvalidStateError,
): string {
  return `The marketplace plugin distribution "${maskIdentifier(
    error.distributionId,
  )}" is in status "${error.from}" but the operation requires one of [${error.expected.join(
    ', ',
  )}].`;
}

/**
 * Mask the first 6 characters of a string identifier and replace the rest
 * with `*`, per `standard-compliance-logging-personal-information.md`. Used
 * to log the `addedBy` user id without leaking the full value.
 */
function maskIdentifier(value: string): string {
  if (!value) return value;
  if (value.length <= 6) return `${value}*`;
  return `${value.slice(0, 6)}*`;
}

/**
 * NestJS controller for organization-scoped marketplace management.
 *
 * Mounted under `/organizations/:orgId/marketplaces` via `RouterModule` in
 * `AppModule`. Admin enforcement happens inside the use cases (they extend
 * `AbstractAdminUseCase`); the controller only forwards the authenticated
 * context and maps the typed domain errors to HTTP responses.
 */
@Controller()
@UseGuards(OrganizationAccessGuard)
export class MarketplacesController {
  constructor(
    @InjectDeploymentAdapter()
    private readonly deploymentAdapter: IDeploymentPort,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('OrganizationMarketplacesController initialized');
  }

  @Post()
  async linkMarketplace(
    @Param('orgId') organizationId: OrganizationId,
    @Body() body: LinkMarketplaceBodyDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<LinkMarketplaceResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/marketplaces - Linking marketplace',
      {
        organizationId,
        addedBy: maskIdentifier(userId),
        owner: body.owner,
        repo: body.repo,
        branch: body.branch,
      },
    );

    try {
      const command: LinkMarketplaceCommand = {
        userId,
        organizationId,
        gitProviderId: body.gitProviderId as GitProviderId,
        owner: body.owner,
        repo: body.repo,
        branch: body.branch,
        name: body.name,
        source: request.clientSource,
      };

      const response = await this.deploymentAdapter.linkMarketplace(command);

      this.logger.info(
        'POST /organizations/:orgId/marketplaces - Marketplace linked successfully',
        {
          organizationId,
          marketplaceId: response.id,
          addedBy: maskIdentifier(userId),
        },
      );

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/marketplaces - Failed to link marketplace',
        {
          organizationId,
          addedBy: maskIdentifier(userId),
          error: errorMessage,
        },
      );
      throw this.mapError(error);
    }
  }

  @Delete(':marketplaceId')
  async unlinkMarketplace(
    @Param('orgId') organizationId: OrganizationId,
    @Param('marketplaceId') marketplaceId: MarketplaceId,
    @Req() request: AuthenticatedRequest,
  ): Promise<UnlinkMarketplaceResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'DELETE /organizations/:orgId/marketplaces/:marketplaceId - Unlinking marketplace',
      {
        organizationId,
        marketplaceId,
        addedBy: maskIdentifier(userId),
      },
    );

    try {
      const command: UnlinkMarketplaceCommand = {
        userId,
        organizationId,
        marketplaceId,
        source: request.clientSource,
      };

      const response = await this.deploymentAdapter.unlinkMarketplace(command);

      this.logger.info(
        'DELETE /organizations/:orgId/marketplaces/:marketplaceId - Marketplace unlinked successfully',
        {
          organizationId,
          marketplaceId,
        },
      );

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'DELETE /organizations/:orgId/marketplaces/:marketplaceId - Failed to unlink marketplace',
        {
          organizationId,
          marketplaceId,
          error: errorMessage,
        },
      );
      throw this.mapError(error);
    }
  }

  @Get()
  async listMarketplaces(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListMarketplacesResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/marketplaces - Listing marketplaces',
      {
        organizationId,
      },
    );

    try {
      const command: ListMarketplacesCommand = {
        userId,
        organizationId,
        source: request.clientSource,
      };

      const response = await this.deploymentAdapter.listMarketplaces(command);

      this.logger.info(
        'GET /organizations/:orgId/marketplaces - Marketplaces listed successfully',
        {
          organizationId,
          count: response.length,
        },
      );

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/marketplaces - Failed to list marketplaces',
        {
          organizationId,
          error: errorMessage,
        },
      );
      throw this.mapError(error);
    }
  }

  @Get('validate-url')
  async validateMarketplaceUrl(
    @Param('orgId') organizationId: OrganizationId,
    @Query() query: ValidateMarketplaceUrlQueryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ValidateMarketplaceUrlResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/marketplaces/validate-url - Validating marketplace URL',
      {
        organizationId,
        url: query.url,
      },
    );

    try {
      const command: ValidateMarketplaceUrlCommand = {
        userId,
        organizationId,
        url: query.url,
        source: request.clientSource,
      };

      const response =
        await this.deploymentAdapter.validateMarketplaceUrl(command);

      this.logger.info(
        'GET /organizations/:orgId/marketplaces/validate-url - Marketplace URL validated successfully',
        {
          organizationId,
          repoPath: response.repoPath,
        },
      );

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/marketplaces/validate-url - Failed to validate marketplace URL',
        {
          organizationId,
          error: errorMessage,
        },
      );
      throw this.mapError(error);
    }
  }

  @Post(':marketplaceId/publish')
  @HttpCode(HttpStatus.ACCEPTED)
  async publishPackageOnMarketplace(
    @Param('orgId') organizationId: OrganizationId,
    @Param('marketplaceId') marketplaceId: MarketplaceId,
    @Body() body: PublishPackageOnMarketplaceBodyDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<PublishPackageOnMarketplaceResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/marketplaces/:marketplaceId/publish - Publishing package',
      {
        organizationId,
        marketplaceId,
        packageId: body.packageId,
        author: maskIdentifier(userId),
      },
    );

    try {
      const command: PublishPackageOnMarketplaceCommand = {
        userId,
        organizationId,
        marketplaceId,
        packageId: body.packageId as PackageId,
        source: request.clientSource,
      };

      const response =
        await this.deploymentAdapter.publishPackageOnMarketplace(command);

      this.logger.info(
        'POST /organizations/:orgId/marketplaces/:marketplaceId/publish - Publish enqueued',
        {
          organizationId,
          marketplaceId,
          marketplaceDistributionId: response.marketplaceDistributionId,
        },
      );

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/marketplaces/:marketplaceId/publish - Failed to publish package',
        {
          organizationId,
          marketplaceId,
          // Never echo the git token — only the failure category surfaces.
          error: errorMessage,
        },
      );
      throw this.mapError(error);
    }
  }

  @Get(':marketplaceId/distributions')
  async listMarketplaceDistributions(
    @Param('orgId') organizationId: OrganizationId,
    @Param('marketplaceId') marketplaceId: MarketplaceId,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListMarketplaceDistributionsResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/marketplaces/:marketplaceId/distributions - Listing distributions',
      {
        organizationId,
        marketplaceId,
      },
    );

    try {
      const command: ListMarketplaceDistributionsCommand = {
        userId,
        organizationId,
        marketplaceId,
        source: request.clientSource,
      };

      const response =
        await this.deploymentAdapter.listMarketplaceDistributions(command);

      this.logger.info(
        'GET /organizations/:orgId/marketplaces/:marketplaceId/distributions - Distributions listed successfully',
        {
          organizationId,
          marketplaceId,
          count: response.length,
        },
      );

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/marketplaces/:marketplaceId/distributions - Failed to list distributions',
        {
          organizationId,
          marketplaceId,
          error: errorMessage,
        },
      );
      throw this.mapError(error);
    }
  }

  @Get(':marketplaceId/distributions/:distributionId/changes')
  async getMarketplaceDistributionChanges(
    @Param('orgId') organizationId: OrganizationId,
    @Param('marketplaceId') marketplaceId: MarketplaceId,
    @Param('distributionId') distributionId: MarketplaceDistributionId,
    @Req() request: AuthenticatedRequest,
  ): Promise<GetMarketplaceDistributionChangesResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/marketplaces/:marketplaceId/distributions/:distributionId/changes - Listing distribution changes',
      {
        organizationId,
        marketplaceId,
        distributionId,
      },
    );

    try {
      const command: GetMarketplaceDistributionChangesCommand = {
        userId,
        organizationId,
        marketplaceId,
        distributionId,
        source: request.clientSource,
      };

      const response =
        await this.deploymentAdapter.getMarketplaceDistributionChanges(command);

      this.logger.info(
        'GET /organizations/:orgId/marketplaces/:marketplaceId/distributions/:distributionId/changes - Changes listed successfully',
        {
          organizationId,
          marketplaceId,
          distributionId,
          count: response.length,
        },
      );

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/marketplaces/:marketplaceId/distributions/:distributionId/changes - Failed to list changes',
        {
          organizationId,
          marketplaceId,
          distributionId,
          error: errorMessage,
        },
      );
      throw this.mapError(error);
    }
  }

  @Post(':marketplaceId/distributions/:distributionId/removal')
  async markPluginForRemovalByDistribution(
    @Param('orgId') organizationId: OrganizationId,
    @Param('marketplaceId') marketplaceId: MarketplaceId,
    @Param('distributionId') distributionId: MarketplaceDistributionId,
    @Req() request: AuthenticatedRequest,
  ): Promise<MarkPluginForRemovalResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/marketplaces/:marketplaceId/distributions/:distributionId/removal - Marking plugin for removal by distribution',
      {
        organizationId,
        marketplaceId,
        distributionId,
        addedBy: maskIdentifier(userId),
      },
    );

    try {
      const command: MarkPluginForRemovalCommand = {
        userId,
        organizationId,
        marketplaceId,
        distributionId,
        source: request.clientSource,
      };

      const response =
        await this.deploymentAdapter.markPluginForRemoval(command);

      this.logger.info(
        'POST /organizations/:orgId/marketplaces/:marketplaceId/distributions/:distributionId/removal - Plugin marked for removal',
        {
          organizationId,
          marketplaceId,
          distributionId,
        },
      );

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/marketplaces/:marketplaceId/distributions/:distributionId/removal - Failed to mark plugin for removal',
        {
          organizationId,
          marketplaceId,
          distributionId,
          error: errorMessage,
        },
      );
      throw this.mapError(error);
    }
  }

  @Post(':marketplaceId/packages/:packageId/removal')
  async markPluginForRemovalByPackage(
    @Param('orgId') organizationId: OrganizationId,
    @Param('marketplaceId') marketplaceId: MarketplaceId,
    @Param('packageId') packageId: PackageId,
    @Req() request: AuthenticatedRequest,
  ): Promise<MarkPluginForRemovalResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/marketplaces/:marketplaceId/packages/:packageId/removal - Marking plugin for removal by package',
      {
        organizationId,
        marketplaceId,
        packageId,
        addedBy: maskIdentifier(userId),
      },
    );

    try {
      const command: MarkPluginForRemovalCommand = {
        userId,
        organizationId,
        marketplaceId,
        packageId,
        source: request.clientSource,
      };

      const response =
        await this.deploymentAdapter.markPluginForRemoval(command);

      this.logger.info(
        'POST /organizations/:orgId/marketplaces/:marketplaceId/packages/:packageId/removal - Plugin marked for removal',
        {
          organizationId,
          marketplaceId,
          packageId,
        },
      );

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/marketplaces/:marketplaceId/packages/:packageId/removal - Failed to mark plugin for removal',
        {
          organizationId,
          marketplaceId,
          packageId,
          error: errorMessage,
        },
      );
      throw this.mapError(error);
    }
  }

  @Post(':marketplaceId/reconcile')
  async syncMarketplaceNow(
    @Param('orgId') organizationId: OrganizationId,
    @Param('marketplaceId') marketplaceId: MarketplaceId,
    @Req() request: AuthenticatedRequest,
  ): Promise<SyncMarketplaceNowResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/marketplaces/:marketplaceId/reconcile - Manual marketplace reconciliation requested',
      {
        organizationId,
        marketplaceId,
        addedBy: maskIdentifier(userId),
      },
    );

    try {
      const command: SyncMarketplaceNowCommand = {
        userId,
        organizationId,
        marketplaceId,
        source: request.clientSource,
      };

      const response = await this.deploymentAdapter.syncMarketplaceNow(command);

      this.logger.info(
        'POST /organizations/:orgId/marketplaces/:marketplaceId/reconcile - Reconciliation completed',
        {
          organizationId,
          marketplaceId,
          state: response.state,
        },
      );

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/marketplaces/:marketplaceId/reconcile - Failed to reconcile marketplace',
        {
          organizationId,
          marketplaceId,
          error: errorMessage,
        },
      );
      throw this.mapError(error);
    }
  }

  @Get(':marketplaceId/plugin-installs')
  async listMarketplacePluginInstalls(
    @Param('orgId') organizationId: OrganizationId,
    @Param('marketplaceId') marketplaceId: MarketplaceId,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListMarketplacePluginInstallsResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/marketplaces/:marketplaceId/plugin-installs - Listing plugin installs',
      {
        organizationId,
        marketplaceId,
      },
    );

    try {
      const command: ListMarketplacePluginInstallsCommand = {
        userId,
        organizationId,
        marketplaceId,
        source: request.clientSource,
      };

      const response =
        await this.deploymentAdapter.listMarketplacePluginInstalls(command);

      this.logger.info(
        'GET /organizations/:orgId/marketplaces/:marketplaceId/plugin-installs - Plugin installs listed',
        {
          organizationId,
          marketplaceId,
          count: response.length,
        },
      );

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/marketplaces/:marketplaceId/plugin-installs - Failed to list plugin installs',
        {
          organizationId,
          marketplaceId,
          error: errorMessage,
        },
      );
      throw this.mapError(error);
    }
  }

  /**
   * Maps typed domain errors thrown by the use cases to NestJS HTTP exceptions
   * with the contract messages the frontend relies on. Anything else falls
   * through unchanged for the global exception filter to handle.
   */
  private mapError(error: unknown): unknown {
    if (error instanceof MarketplaceAlreadyLinkedError) {
      return new ConflictException(error.message);
    }
    if (error instanceof MarketplacePluginNameConflictError) {
      return new ConflictException(error.message);
    }
    if (error instanceof GitRepoAlreadyLinkedAsStandardError) {
      return new ConflictException(error.message);
    }
    if (error instanceof MarketplaceDescriptorNotFoundError) {
      return new BadRequestException(error.message);
    }
    if (error instanceof MarketplaceDescriptorBadFormatError) {
      return new BadRequestException(error.message);
    }
    if (error instanceof UnknownMarketplaceDescriptorError) {
      return new BadRequestException(error.message);
    }
    if (error instanceof MarketplaceDescriptorParseError) {
      return new BadRequestException(error.message);
    }
    if (error instanceof MarketplaceUrlNotReachableError) {
      return new BadRequestException(error.message);
    }
    if (error instanceof MarketplaceNotFoundError) {
      return new NotFoundException(
        USER_FACING_ERROR_MESSAGE.marketplaceNotFound,
      );
    }
    if (error instanceof PluginDistributionNotFoundError) {
      return new NotFoundException(pluginDistributionNotFoundMessage(error));
    }
    if (error instanceof PluginDistributionInvalidStateError) {
      return new ConflictException(
        pluginDistributionInvalidStateMessage(error),
      );
    }
    if (error instanceof OrganizationAdminRequiredError) {
      return new ForbiddenException(error.message);
    }
    if (error instanceof GitProviderNotFoundError) {
      return new NotFoundException(
        USER_FACING_ERROR_MESSAGE.gitProviderNotFound,
      );
    }
    if (error instanceof GitProviderOrganizationMismatchError) {
      return new ForbiddenException(
        USER_FACING_ERROR_MESSAGE.gitProviderOrganizationMismatch,
      );
    }
    if (error instanceof GitProviderMissingTokenError) {
      return new BadRequestException(
        USER_FACING_ERROR_MESSAGE.gitProviderMissingToken,
      );
    }
    if (error instanceof GitProviderTokenInvalidError) {
      return new BadRequestException(error.message);
    }
    return error;
  }
}
