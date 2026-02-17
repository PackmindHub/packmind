import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  ListChangeProposalsByArtefactResponse,
  OrganizationId,
  SpaceId,
  StandardId,
} from '@packmind/types';
import { StandardsChangeProposalsService } from './standards-change-proposals.service';
import { OrganizationAccessGuard } from '../../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../../guards/space-access.guard';

const origin = 'OrganizationsSpacesStandardsChangeProposalsController';

/**
 * Controller for standard-scoped change proposal routes
 * Actual path: /organizations/:orgId/spaces/:spaceId/standards/:standardId/change-proposals (inherited via RouterModule in AppModule)
 */
@Controller()
@UseGuards(OrganizationAccessGuard, SpaceAccessGuard)
export class OrganizationsSpacesStandardsChangeProposalsController {
  constructor(
    private readonly service: StandardsChangeProposalsService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {}

  /**
   * List change proposals for a standard
   * GET /organizations/:orgId/spaces/:spaceId/standards/:standardId/change-proposals
   */
  @Get()
  async listChangeProposalsByStandard(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('standardId') standardId: StandardId,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListChangeProposalsByArtefactResponse> {
    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/standards/:standardId/change-proposals',
      { organizationId, spaceId, standardId },
    );

    const result = await this.service.listChangeProposalsByStandard({
      userId: request.user.userId,
      organizationId,
      spaceId,
      artefactId: standardId,
    });

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/standards/:standardId/change-proposals - Listed successfully',
      {
        organizationId,
        spaceId,
        standardId,
        count: result.changeProposals.length,
      },
    );

    return result;
  }
}
