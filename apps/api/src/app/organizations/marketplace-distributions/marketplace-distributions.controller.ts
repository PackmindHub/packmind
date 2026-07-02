import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  FindMarketplaceDistributionByIdCommand,
  FindMarketplaceDistributionByIdResponse,
  IDeploymentPort,
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
  ): Promise<FindMarketplaceDistributionByIdResponse> {
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

    return this.deploymentAdapter.findMarketplaceDistributionById(command);
  }
}
