import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  ApplyChangeProposalsResponse,
  ChangeProposalId,
  ListChangeProposalsByArtefactResponse,
  OrganizationId,
  RecipeId,
  SpaceId,
} from '@packmind/types';
import { RecipesChangeProposalsService } from './recipes-change-proposals.service';
import { OrganizationAccessGuard } from '../../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../../guards/space-access.guard';

const origin = 'OrganizationsSpacesRecipesChangeProposalsController';

/**
 * Controller for recipe-scoped change proposal routes
 * Actual path: /organizations/:orgId/spaces/:spaceId/recipes/:recipeId/change-proposals (inherited via RouterModule in AppModule)
 */
@Controller()
@UseGuards(OrganizationAccessGuard, SpaceAccessGuard)
export class OrganizationsSpacesRecipesChangeProposalsController {
  constructor(
    private readonly service: RecipesChangeProposalsService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {}

  /**
   * List change proposals for a recipe
   * GET /organizations/:orgId/spaces/:spaceId/recipes/:recipeId/change-proposals
   */
  @Get()
  async listChangeProposalsByRecipe(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('recipeId') recipeId: RecipeId,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListChangeProposalsByArtefactResponse> {
    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/recipes/:recipeId/change-proposals',
      { organizationId, spaceId, recipeId },
    );

    const result = await this.service.listChangeProposalsByRecipe({
      userId: request.user.userId,
      organizationId,
      spaceId,
      artefactId: recipeId,
    });

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/recipes/:recipeId/change-proposals - Listed successfully',
      {
        organizationId,
        spaceId,
        recipeId,
        count: result.changeProposals.length,
      },
    );

    return result;
  }

  /**
   * Apply or reject change proposals for a recipe
   * POST /organizations/:orgId/spaces/:spaceId/recipes/:recipeId/change-proposals/apply
   */
  @Post('apply')
  async applyRecipeChangeProposals(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('recipeId') recipeId: RecipeId,
    @Body()
    body: { accepted: ChangeProposalId[]; rejected: ChangeProposalId[] },
    @Req() request: AuthenticatedRequest,
  ): Promise<ApplyChangeProposalsResponse> {
    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/recipes/:recipeId/change-proposals/apply',
      {
        organizationId,
        spaceId,
        recipeId,
        acceptedCount: body.accepted.length,
        rejectedCount: body.rejected.length,
      },
    );

    const result = await this.service.applyRecipeChangeProposals({
      userId: request.user.userId,
      organizationId,
      spaceId,
      artefactId: recipeId,
      accepted: body.accepted,
      rejected: body.rejected,
    });

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/recipes/:recipeId/change-proposals/apply - Applied successfully',
      {
        organizationId,
        spaceId,
        recipeId,
        successCount: result.success.length,
        failureCount: result.failure.length,
      },
    );

    return result;
  }
}
