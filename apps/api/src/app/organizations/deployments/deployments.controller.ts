import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  DeploymentOverview,
  Distribution,
  StandardsDeployment,
  RecipesDeployment,
  PackagesDeployment,
  StandardDeploymentOverview,
  PublishRecipesCommand,
  PublishStandardsCommand,
  PublishPackagesCommand,
  TargetId,
  DistributionStatus,
  UpdateRenderModeConfigurationCommand,
  RenderModeConfiguration,
  RenderMode,
  GetRenderModeConfigurationCommand,
  GetRenderModeConfigurationResult,
  RecipeId,
  RecipeVersionId,
  StandardId,
  StandardVersionId,
  PackageId,
  OrganizationId,
  GetDeploymentOverviewCommand,
  GetStandardDeploymentOverviewCommand,
  ListDeploymentsByRecipeCommand,
  ListDeploymentsByStandardCommand,
  ListDeploymentsByPackageCommand,
  ListDistributionsByRecipeCommand,
  ListDistributionsByStandardCommand,
} from '@packmind/types';
import { DeploymentsService } from './deployments.service';
import { PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { OrganizationAccessGuard } from '../guards/organization-access.guard';

const origin = 'OrganizationDeploymentsController';

@Controller()
@UseGuards(OrganizationAccessGuard)
export class DeploymentsController {
  constructor(
    private readonly deploymentsService: DeploymentsService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('OrganizationDeploymentsController initialized');
  }

  @Get('recipe/:id')
  async getDeploymentRecipe(
    @Param('orgId') organizationId: OrganizationId,
    @Param('id') id: RecipeId,
    @Req() request: AuthenticatedRequest,
  ): Promise<RecipesDeployment[]> {
    this.logger.info(
      'GET /organizations/:orgId/deployments/recipe/:id - Fetching deployments by recipe ID',
      {
        recipeId: id,
        organizationId,
      },
    );

    try {
      const command: ListDeploymentsByRecipeCommand = {
        userId: request.user.userId,
        organizationId,
        recipeId: id,
      };

      const deployments =
        await this.deploymentsService.listDeploymentsByRecipe(command);

      if (!deployments || deployments.length === 0) {
        this.logger.warn(
          'GET /organizations/:orgId/deployments/recipe/:id - No deployments found',
          {
            recipeId: id,
            organizationId,
          },
        );
        return [];
      }

      this.logger.info(
        'GET /organizations/:orgId/deployments/recipe/:id - Deployments fetched successfully',
        {
          recipeId: id,
          organizationId,
          count: deployments.length,
        },
      );

      return deployments;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/deployments/recipe/:id - Failed to fetch deployments',
        {
          recipeId: id,
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('standard/:id')
  async getDeploymentsByStandardId(
    @Param('orgId') organizationId: OrganizationId,
    @Param('id') id: StandardId,
    @Req() request: AuthenticatedRequest,
  ): Promise<StandardsDeployment[]> {
    this.logger.info(
      'GET /organizations/:orgId/deployments/standard/:id - Fetching deployments by standard ID',
      {
        standardId: id,
        organizationId,
      },
    );

    try {
      const command: ListDeploymentsByStandardCommand = {
        userId: request.user.userId,
        organizationId,
        standardId: id,
      };

      const deployments =
        await this.deploymentsService.listDeploymentsByStandard(command);

      if (!deployments || deployments.length === 0) {
        this.logger.warn(
          'GET /organizations/:orgId/deployments/standard/:id - No deployments found',
          {
            standardId: id,
            organizationId,
          },
        );
        return [];
      }

      this.logger.info(
        'GET /organizations/:orgId/deployments/standard/:id - Deployments fetched successfully',
        {
          standardId: id,
          organizationId,
          count: deployments.length,
        },
      );

      return deployments;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/deployments/standard/:id - Failed to fetch deployments',
        {
          standardId: id,
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('package/:id')
  async getDeploymentsByPackageId(
    @Param('orgId') organizationId: OrganizationId,
    @Param('id') id: PackageId,
    @Req() request: AuthenticatedRequest,
  ): Promise<Distribution[]> {
    this.logger.info(
      'GET /organizations/:orgId/deployments/package/:id - Fetching deployments by package ID',
      {
        packageId: id,
        organizationId,
      },
    );

    try {
      const command: ListDeploymentsByPackageCommand = {
        userId: request.user.userId,
        organizationId,
        packageId: id,
      };

      const deployments =
        await this.deploymentsService.listDeploymentsByPackage(command);

      if (!deployments || deployments.length === 0) {
        this.logger.warn(
          'GET /organizations/:orgId/deployments/package/:id - No deployments found',
          {
            packageId: id,
            organizationId,
          },
        );
        return [];
      }

      this.logger.info(
        'GET /organizations/:orgId/deployments/package/:id - Deployments fetched successfully',
        {
          packageId: id,
          organizationId,
          count: deployments.length,
        },
      );

      return deployments;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/deployments/package/:id - Failed to fetch deployments',
        {
          packageId: id,
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('distributions/recipe/:id')
  async getDistributionsByRecipeId(
    @Param('orgId') organizationId: OrganizationId,
    @Param('id') id: RecipeId,
    @Req() request: AuthenticatedRequest,
  ): Promise<Distribution[]> {
    this.logger.info(
      'GET /organizations/:orgId/deployments/distributions/recipe/:id - Fetching distributions by recipe ID',
      {
        recipeId: id,
        organizationId,
      },
    );

    try {
      const command: ListDistributionsByRecipeCommand = {
        userId: request.user.userId,
        organizationId,
        recipeId: id,
      };

      const distributions =
        await this.deploymentsService.listDistributionsByRecipe(command);

      if (!distributions || distributions.length === 0) {
        this.logger.warn(
          'GET /organizations/:orgId/deployments/distributions/recipe/:id - No distributions found',
          {
            recipeId: id,
            organizationId,
          },
        );
        return [];
      }

      this.logger.info(
        'GET /organizations/:orgId/deployments/distributions/recipe/:id - Distributions fetched successfully',
        {
          recipeId: id,
          organizationId,
          count: distributions.length,
        },
      );

      return distributions;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/deployments/distributions/recipe/:id - Failed to fetch distributions',
        {
          recipeId: id,
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('distributions/standard/:id')
  async getDistributionsByStandardId(
    @Param('orgId') organizationId: OrganizationId,
    @Param('id') id: StandardId,
    @Req() request: AuthenticatedRequest,
  ): Promise<Distribution[]> {
    this.logger.info(
      'GET /organizations/:orgId/deployments/distributions/standard/:id - Fetching distributions by standard ID',
      {
        standardId: id,
        organizationId,
      },
    );

    try {
      const command: ListDistributionsByStandardCommand = {
        userId: request.user.userId,
        organizationId,
        standardId: id,
      };

      const distributions =
        await this.deploymentsService.listDistributionsByStandard(command);

      if (!distributions || distributions.length === 0) {
        this.logger.warn(
          'GET /organizations/:orgId/deployments/distributions/standard/:id - No distributions found',
          {
            standardId: id,
            organizationId,
          },
        );
        return [];
      }

      this.logger.info(
        'GET /organizations/:orgId/deployments/distributions/standard/:id - Distributions fetched successfully',
        {
          standardId: id,
          organizationId,
          count: distributions.length,
        },
      );

      return distributions;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/deployments/distributions/standard/:id - Failed to fetch distributions',
        {
          standardId: id,
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('standards/overview')
  async getStandardDeploymentOverview(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
  ): Promise<StandardDeploymentOverview> {
    this.logger.info(
      'GET /organizations/:orgId/deployments/standards/overview - Fetching standard deployment overview',
      {
        organizationId,
      },
    );

    try {
      const command: GetStandardDeploymentOverviewCommand = {
        userId: request.user.userId,
        organizationId,
      };

      const overview =
        await this.deploymentsService.getStandardDeploymentOverview(command);

      this.logger.info(
        'GET /organizations/:orgId/deployments/standards/overview - Standard deployment overview fetched successfully',
        {
          organizationId,
          repositoriesCount: overview.repositories.length,
          standardsCount: overview.standards.length,
        },
      );

      return overview;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/deployments/standards/overview - Failed to fetch standard deployment overview',
        {
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('recipes/overview')
  async getRecipesDeploymentOverview(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
  ): Promise<DeploymentOverview> {
    this.logger.info(
      'GET /organizations/:orgId/deployments/recipes/overview - Fetching recipes deployment overview',
      {
        organizationId,
      },
    );

    try {
      const command: GetDeploymentOverviewCommand = {
        userId: request.user.userId,
        organizationId,
      };

      const overview =
        await this.deploymentsService.getDeploymentOverview(command);

      this.logger.info(
        'GET /organizations/:orgId/deployments/recipes/overview - Recipes deployment overview fetched successfully',
        {
          organizationId,
          repositoriesCount: overview.repositories.length,
          recipesCount: overview.recipes.length,
        },
      );

      return overview;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/deployments/recipes/overview - Failed to fetch recipes deployment overview',
        {
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Post('recipes/publish')
  async publishRecipes(
    @Param('orgId') organizationId: OrganizationId,
    @Body()
    body: { targetIds: TargetId[]; recipeVersionIds: RecipeVersionId[] },
    @Req() request: AuthenticatedRequest,
  ): Promise<RecipesDeployment[]> {
    this.logger.info(
      'POST /organizations/:orgId/deployments/recipes/publish - Publishing recipes',
      {
        organizationId,
        targetIdsCount: body.targetIds.length,
        recipeVersionIdsCount: body.recipeVersionIds.length,
      },
    );

    try {
      const command: PublishRecipesCommand = {
        userId: request.user.userId,
        organizationId,
        targetIds: body.targetIds,
        recipeVersionIds: body.recipeVersionIds,
      };

      const deployments = await this.deploymentsService.publishRecipes(command);

      this.logger.info(
        'POST /organizations/:orgId/deployments/recipes/publish - Recipes published successfully',
        {
          organizationId,
          deploymentsCount: deployments.length,
        },
      );

      return deployments;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/deployments/recipes/publish - Failed to publish recipes',
        {
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Post('standards/publish')
  async publishStandards(
    @Param('orgId') organizationId: OrganizationId,
    @Body()
    body: { targetIds: TargetId[]; standardVersionIds: StandardVersionId[] },
    @Req() request: AuthenticatedRequest,
  ): Promise<StandardsDeployment[]> {
    this.logger.info(
      'POST /organizations/:orgId/deployments/standards/publish - Publishing standards',
      {
        organizationId,
        targetIdsCount: body.targetIds.length,
        standardVersionIdsCount: body.standardVersionIds.length,
      },
    );

    try {
      const command: PublishStandardsCommand = {
        userId: request.user.userId,
        organizationId,
        targetIds: body.targetIds,
        standardVersionIds: body.standardVersionIds,
      };

      const deployments =
        await this.deploymentsService.publishStandards(command);

      this.logger.info(
        'POST /organizations/:orgId/deployments/standards/publish - Standards published successfully',
        {
          organizationId,
          deploymentsCount: deployments.length,
          deploymentIds: deployments.map((d) => d.id),
          successfulDeployments: deployments.filter(
            (d) => d.status === DistributionStatus.success,
          ).length,
          failedDeployments: deployments.filter(
            (d) => d.status === DistributionStatus.failure,
          ).length,
        },
      );

      return deployments;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/deployments/standards/publish - Failed to publish standards',
        {
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Post('packages/publish')
  async publishPackages(
    @Param('orgId') organizationId: OrganizationId,
    @Body()
    body: { targetIds: TargetId[]; packageIds: PackageId[] },
    @Req() request: AuthenticatedRequest,
  ): Promise<PackagesDeployment[]> {
    this.logger.info(
      'POST /organizations/:orgId/deployments/packages/publish - Publishing packages',
      {
        organizationId,
        targetIdsCount: body.targetIds.length,
        packageIdsCount: body.packageIds.length,
      },
    );

    try {
      const command: PublishPackagesCommand = {
        userId: request.user.userId,
        organizationId,
        targetIds: body.targetIds,
        packageIds: body.packageIds,
      };

      const deployments =
        await this.deploymentsService.publishPackages(command);

      this.logger.info(
        'POST /organizations/:orgId/deployments/packages/publish - Packages published successfully',
        {
          organizationId,
          deploymentsCount: deployments.length,
          deploymentIds: deployments.map((d) => d.id),
          successfulDeployments: deployments.filter(
            (d) => d.status === DistributionStatus.success,
          ).length,
          failedDeployments: deployments.filter(
            (d) => d.status === DistributionStatus.failure,
          ).length,
        },
      );

      return deployments;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/deployments/packages/publish - Failed to publish packages',
        {
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('renderModeConfiguration')
  async getRenderModeConfiguration(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
  ): Promise<GetRenderModeConfigurationResult> {
    this.logger.info(
      'GET /organizations/:orgId/deployments/renderModeConfiguration - Fetching render mode configuration',
      {
        organizationId,
      },
    );

    try {
      const command: GetRenderModeConfigurationCommand = {
        userId: request.user.userId,
        organizationId,
      };

      const result =
        await this.deploymentsService.getRenderModeConfiguration(command);

      this.logger.info(
        'GET /organizations/:orgId/deployments/renderModeConfiguration - Render mode configuration fetched successfully',
        {
          organizationId,
          hasConfiguration: result.configuration !== null,
          activeRenderModes: result.configuration?.activeRenderModes,
        },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/deployments/renderModeConfiguration - Failed to fetch render mode configuration',
        {
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Post('renderModeConfiguration')
  async updateRenderModeConfiguration(
    @Param('orgId') organizationId: OrganizationId,
    @Body() body: { activeRenderModes: RenderMode[] },
    @Req() request: AuthenticatedRequest,
  ): Promise<RenderModeConfiguration> {
    this.logger.info(
      'POST /organizations/:orgId/deployments/renderModeConfiguration - Updating render mode configuration',
      {
        organizationId,
        requestedRenderModes: body.activeRenderModes,
      },
    );

    try {
      const command: UpdateRenderModeConfigurationCommand = {
        userId: request.user.userId,
        organizationId,
        activeRenderModes: body.activeRenderModes,
      };

      const configuration =
        await this.deploymentsService.updateRenderModeConfiguration(command);

      this.logger.info(
        'POST /organizations/:orgId/deployments/renderModeConfiguration - Render mode configuration updated successfully',
        {
          organizationId,
          activeRenderModes: configuration.activeRenderModes,
        },
      );

      return configuration;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/deployments/renderModeConfiguration - Failed to update render mode configuration',
        {
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
