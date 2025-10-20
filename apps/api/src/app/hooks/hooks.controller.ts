import { Body, Controller, Headers, Post, Param, Get } from '@nestjs/common';
import { RecipesService } from '../recipes/recipes.service';
import { Configuration, PackmindLogger, Recipe } from '@packmind/shared';
import { OrganizationId, createOrganizationId } from '@packmind/accounts';
import { Public } from '@packmind/shared-nest';

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

  @Get('')
  async getHooks(@Param('orgId') orgId: string) {
    const organizationId: OrganizationId = createOrganizationId(orgId);

    this.logger.info('GET /:orgId/hooks - Listing available webhooks', {
      organizationId,
    });

    const baseUrl = await Configuration.getConfigWithDefault(
      'APP_WEB_URL',
      'http://localhost:8081',
    );
    return {
      github: `${baseUrl}/api/v0/${orgId}/hooks/github`,
      gitlab: `${baseUrl}/api/v0/${orgId}/hooks/gitlab`,
    };
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
