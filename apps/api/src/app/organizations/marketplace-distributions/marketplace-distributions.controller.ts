import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  FindMarketplaceDistributionByIdCommand,
  IDeploymentPort,
  MarketplaceDistribution,
  MarketplaceDistributionId,
  OrganizationId,
} from '@packmind/types';
import { OrganizationAccessGuard } from '../guards/organization-access.guard';
import { InjectDeploymentAdapter } from '../../shared/HexaInjection';

const origin = 'OrganizationMarketplaceDistributionsController';

/**
 * Read-only controller for marketplace publish distributions.
 *
 * Mounted under `/organizations/:orgId/marketplace-distributions` so the
 * frontend can poll the publish lifecycle (`in_progress → success | failure |
 * no_changes`) using the id returned by the publish endpoint.
 */
@Controller()
@UseGuards(OrganizationAccessGuard)
export class MarketplaceDistributionsController {
  constructor(
    @InjectDeploymentAdapter()
    private readonly deploymentAdapter: IDeploymentPort,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info(
      'OrganizationMarketplaceDistributionsController initialized',
    );
  }

  @Get(':marketplaceDistributionId')
  async getMarketplaceDistributionById(
    @Param('orgId') organizationId: OrganizationId,
    @Param('marketplaceDistributionId')
    marketplaceDistributionId: MarketplaceDistributionId,
    @Req() request: AuthenticatedRequest,
  ): Promise<MarketplaceDistribution> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/marketplace-distributions/:marketplaceDistributionId',
      {
        organizationId,
        marketplaceDistributionId,
      },
    );

    const command: FindMarketplaceDistributionByIdCommand = {
      userId,
      organizationId,
      marketplaceDistributionId,
      source: request.clientSource,
    };

    const row =
      await this.deploymentAdapter.findMarketplaceDistributionById(command);
    if (!row) {
      throw new NotFoundException(
        `Marketplace distribution "${marketplaceDistributionId}" was not found`,
      );
    }
    return row;
  }
}
