import { Body, Controller, Headers, Post, Param } from '@nestjs/common';
import { RecipesService } from '../recipes/recipes.service';
import { PackmindLogger, Recipe } from '@packmind/shared';
import { Public } from '../auth/auth.guard';
import { OrganizationId, createOrganizationId } from '@packmind/accounts';

const origin = 'HooksController';

@Public()
@Controller(':orgId/hooks')
export class HooksController {
  constructor(
    private readonly recipesService: RecipesService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('HooksController initialized');
  }

  @Post('github')
  async addRecipe(
    @Param('orgId') orgId: string,
    @Body() hookBody: unknown,
    @Headers() headers: Record<string, string>,
  ): Promise<Recipe[]> {
    const organizationId: OrganizationId = createOrganizationId(orgId);

    this.logger.info('POST /:orgId/hooks/github - Processing GitHub webhook', {
      organizationId,
      eventType: headers['x-github-event'],
      hasBody: !!hookBody,
    });

    try {
      return await this.recipesService.updateRecipesFromGitHub(
        hookBody,
        organizationId,
        headers,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /:orgId/hooks/github - Failed to process webhook',
        {
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Post('gitlab')
  async addRecipeGitlab(
    @Param('orgId') orgId: string,
    @Body() hookBody: unknown,
    @Headers() headers: Record<string, string>,
  ): Promise<Recipe[]> {
    const organizationId: OrganizationId = createOrganizationId(orgId);

    this.logger.info('POST /:orgId/hooks/gitlab - Processing GitLab webhook', {
      organizationId,
      eventType: headers['x-gitlab-event'],
      hasBody: !!hookBody,
    });

    try {
      return await this.recipesService.updateRecipesFromGitLab(
        hookBody,
        organizationId,
        headers,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /:orgId/hooks/gitlab - Failed to process webhook',
        {
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
