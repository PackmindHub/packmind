import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
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
}
