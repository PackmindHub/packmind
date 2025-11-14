import { Controller, Get, Param, Post, Body, Req } from '@nestjs/common';
import {
  DeploymentOverview,
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
} from '@packmind/types';
import { DeploymentsService } from './deployments.service';
import { PackmindLogger } from '@packmind/logger';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedRequest } from '@packmind/node-utils';

const origin = 'DeploymentsController';

@Controller('/deployments')
export class DeploymentsController {
  constructor(
    private readonly deploymentsService: DeploymentsService,
    private readonly authService: AuthService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('DeploymentsController initialized');
  }

  @Get('recipe/:id')
  async getDeploymentRecipe(
    @Param('id') id: RecipeId,
    @Req() request: AuthenticatedRequest,
  ): Promise<RecipesDeployment[]> {
    this.logger.info(
      'GET /deployments/recipe/:id - Fetching deployments by recipe ID',
      {
        standardId: id,
      },
    );

    try {
      const deployments = await this.deploymentsService.listDeploymentsByRecipe(
        this.authService.makePackmindCommand(request, { recipeId: id }),
      );

      if (!deployments || deployments.length === 0) {
        this.logger.warn('GET /deployments/recipe/:id - No deployments found', {
          standardId: id,
        });
        return [];
      }

      this.logger.info(
        'GET /deployments/recipe/:id - Deployments fetched successfully',
        {
          standardId: id,
          count: deployments.length,
        },
      );

      return deployments;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /deployments/recipe/:id - Failed to fetch deployments',
        {
          standardId: id,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('standard/:id')
  async getDeploymentsByStandardId(
    @Param('id') id: StandardId,
    @Req() request: AuthenticatedRequest,
  ): Promise<StandardsDeployment[]> {
    this.logger.info(
      'GET /deployments/standard/:id - Fetching deployments by standard ID',
      {
        standardId: id,
      },
    );

    try {
      const deployments =
        await this.deploymentsService.listDeploymentsByStandard(
          this.authService.makePackmindCommand(request, { standardId: id }),
        );

      if (!deployments || deployments.length === 0) {
        this.logger.warn(
          'GET /deployments/standard/:id - No deployments found',
          {
            standardId: id,
          },
        );
        return [];
      }

      this.logger.info(
        'GET /deployments/standard/:id - Deployments fetched successfully',
        {
          standardId: id,
          count: deployments.length,
        },
      );

      return deployments;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /deployments/standard/:id - Failed to fetch deployments',
        {
          standardId: id,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('standards/overview')
  async getStandardDeploymentOverview(
    @Req() request: AuthenticatedRequest,
  ): Promise<StandardDeploymentOverview> {
    this.logger.info(
      'GET /deployments/standards/overview - Fetching standard deployment overview',
    );

    try {
      const overview =
        await this.deploymentsService.getStandardDeploymentOverview(
          this.authService.makePackmindCommand(request),
        );

      this.logger.info(
        'GET /deployments/overview - Standard deployment overview fetched successfully',
        {
          repositoriesCount: overview.repositories.length,
          standardsCount: overview.standards.length,
        },
      );

      return overview;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /deployments/overview - Failed to fetch standard deployment overview',
        {
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('recipes/overview')
  async getRecipesDeploymentOverview(
    @Req() request: AuthenticatedRequest,
  ): Promise<DeploymentOverview> {
    this.logger.info(
      'GET /deployments/recipes/overview - Fetching recipes deployment overview',
    );

    try {
      const overview = await this.deploymentsService.getDeploymentOverview(
        this.authService.makePackmindCommand(request),
      );

      this.logger.info(
        'GET /deployments/recipes/overview - Recipes deployment overview fetched successfully',
        {
          repositoriesCount: overview.repositories.length,
          standardsCount: overview.recipes.length,
        },
      );

      return overview;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /deployments/recipes/overview - Failed to fetch standard deployment overview',
        {
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Post('recipes/publish')
  async publishRecipes(
    @Body()
    body: { targetIds: TargetId[]; recipeVersionIds: RecipeVersionId[] },
    @Req() request: AuthenticatedRequest,
  ): Promise<RecipesDeployment[]> {
    this.logger.info('POST /deployments/recipes/publish - Publishing recipes', {
      targetIdsCount: body.targetIds.length,
      recipeVersionIdsCount: body.recipeVersionIds.length,
    });

    try {
      const command: PublishRecipesCommand =
        this.authService.makePackmindCommand(request, {
          targetIds: body.targetIds,
          recipeVersionIds: body.recipeVersionIds,
        });

      const deployments = await this.deploymentsService.publishRecipes(command);

      this.logger.info(
        'POST /deployments/recipes/publish - Recipes published successfully',
        {
          deploymentsCount: deployments.length,
        },
      );

      return deployments;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /deployments/recipes/publish - Failed to publish recipes',
        {
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Post('standards/publish')
  async publishStandards(
    @Body()
    body: { targetIds: TargetId[]; standardVersionIds: StandardVersionId[] },
    @Req() request: AuthenticatedRequest,
  ): Promise<StandardsDeployment[]> {
    this.logger.info(
      'POST /deployments/standards/publish - Publishing standards',
      {
        targetIdsCount: body.targetIds.length,
        standardVersionIdsCount: body.standardVersionIds.length,
      },
    );

    try {
      const command: PublishStandardsCommand =
        this.authService.makePackmindCommand(request, {
          targetIds: body.targetIds,
          standardVersionIds: body.standardVersionIds,
        });

      const deployments =
        await this.deploymentsService.publishStandards(command);

      this.logger.info(
        'POST /deployments/standards/publish - Standards published successfully',
        {
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
        'POST /deployments/standards/publish - Failed to publish standards',
        {
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Post('packages/publish')
  async publishPackages(
    @Body()
    body: { targetIds: TargetId[]; packageIds: PackageId[] },
    @Req() request: AuthenticatedRequest,
  ): Promise<PackagesDeployment[]> {
    this.logger.info(
      'POST /deployments/packages/publish - Publishing packages',
      {
        targetIdsCount: body.targetIds.length,
        packageIdsCount: body.packageIds.length,
      },
    );

    try {
      const command: PublishPackagesCommand =
        this.authService.makePackmindCommand(request, {
          targetIds: body.targetIds,
          packageIds: body.packageIds,
        });

      const deployments =
        await this.deploymentsService.publishPackages(command);

      this.logger.info(
        'POST /deployments/packages/publish - Packages published successfully',
        {
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
        'POST /deployments/packages/publish - Failed to publish packages',
        {
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('renderModeConfiguration')
  async getRenderModeConfiguration(
    @Req() request: AuthenticatedRequest,
  ): Promise<GetRenderModeConfigurationResult> {
    this.logger.info(
      'GET /deployments/renderModeConfiguration - Fetching render mode configuration',
    );

    try {
      const command: GetRenderModeConfigurationCommand =
        this.authService.makePackmindCommand(request);

      const result =
        await this.deploymentsService.getRenderModeConfiguration(command);

      this.logger.info(
        'GET /deployments/renderModeConfiguration - Render mode configuration fetched successfully',
        {
          hasConfiguration: result.configuration !== null,
          activeRenderModes: result.configuration?.activeRenderModes,
        },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /deployments/renderModeConfiguration - Failed to fetch render mode configuration',
        {
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Post('renderModeConfiguration')
  async updateRenderModeConfiguration(
    @Body() body: { activeRenderModes: RenderMode[] },
    @Req() request: AuthenticatedRequest,
  ): Promise<RenderModeConfiguration> {
    this.logger.info(
      'POST /deployments/renderModeConfiguration - Updating render mode configuration',
      {
        requestedRenderModes: body.activeRenderModes,
      },
    );

    try {
      const command: UpdateRenderModeConfigurationCommand =
        this.authService.makePackmindCommand(request, {
          activeRenderModes: body.activeRenderModes,
        });

      const configuration =
        await this.deploymentsService.updateRenderModeConfiguration(command);

      this.logger.info(
        'POST /deployments/renderModeConfiguration - Render mode configuration updated successfully',
        {
          activeRenderModes: configuration.activeRenderModes,
        },
      );

      return configuration;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /deployments/renderModeConfiguration - Failed to update render mode configuration',
        {
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
