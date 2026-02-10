import {
  Body,
  Controller,
  Get,
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
  ListCommandChangeProposalsResponse,
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
   * List change proposals for a recipe
   * GET /organizations/:orgId/spaces/:spaceId/change-proposals/:recipeId
   */
  @Get(':recipeId')
  async listCommandChangeProposals(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('recipeId') recipeId: RecipeId,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListCommandChangeProposalsResponse> {
    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/change-proposals/:recipeId - Listing change proposals',
      {
        organizationId,
        spaceId,
        recipeId,
      },
    );

    try {
      const result =
        await this.changeProposalsService.listCommandChangeProposals({
          userId: request.user.userId,
          organizationId,
          recipeId,
        });

      this.logger.info(
        'GET /organizations/:orgId/spaces/:spaceId/change-proposals/:recipeId - Change proposals listed successfully',
        {
          organizationId,
          spaceId,
          recipeId,
        },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/spaces/:spaceId/change-proposals/:recipeId - Failed to list change proposals',
        {
          organizationId,
          spaceId,
          recipeId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

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
