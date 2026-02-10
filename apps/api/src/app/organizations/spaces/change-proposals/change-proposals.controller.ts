import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  ChangeProposal,
  ChangeProposalId,
  OrganizationId,
  RecipeId,
  SpaceId,
} from '@packmind/types';
import { ChangeProposalsService } from './change-proposals.service';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../guards/space-access.guard';
import { ChangeProposalNotFoundError } from '@packmind/playbook-change-management';
import { ChangeProposalNotPendingError } from '@packmind/playbook-change-management';

const origin = 'OrganizationsSpacesChangeProposalsController';

/**
 * Controller for space-scoped change proposal routes within organizations
 * Actual path: /organizations/:orgId/spaces/:spaceId/change-proposals (inherited via RouterModule in AppModule)
 */
@Controller()
@UseGuards(OrganizationAccessGuard, SpaceAccessGuard)
export class OrganizationsSpacesChangeProposalsController {
  constructor(
    private readonly changeProposalsService: ChangeProposalsService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {}

  /**
   * Reject a change proposal
   * POST /organizations/:orgId/spaces/:spaceId/change-proposals/:changeProposalId/reject
   */
  @Post(':changeProposalId/reject')
  @HttpCode(HttpStatus.OK)
  async rejectChangeProposal(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('changeProposalId') changeProposalId: ChangeProposalId,
    @Body() body: { recipeId: RecipeId },
    @Req() request: AuthenticatedRequest,
  ): Promise<ChangeProposal> {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/change-proposals/:changeProposalId/reject - Rejecting change proposal',
      {
        organizationId,
        spaceId,
        changeProposalId,
      },
    );

    try {
      const changeProposal =
        await this.changeProposalsService.rejectChangeProposal(
          body.recipeId,
          changeProposalId,
          organizationId,
          userId,
        );

      this.logger.info(
        'POST /organizations/:orgId/spaces/:spaceId/change-proposals/:changeProposalId/reject - Change proposal rejected',
        {
          organizationId,
          spaceId,
          changeProposalId,
        },
      );

      return changeProposal;
    } catch (error) {
      if (error instanceof ChangeProposalNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof ChangeProposalNotPendingError) {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }
  }
}
