import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ActiveDistributedPackagesByTarget,
  Distribution,
  PackagesDeployment,
  PublishCommandsCommand,
  PublishStandardsCommand,
  PublishPackagesCommand,
  TargetId,
  DistributionStatus,
  UpdateRenderModeConfigurationCommand,
  RenderModeConfiguration,
  RenderMode,
  GetRenderModeConfigurationCommand,
  GetRenderModeConfigurationResponse,
  CommandId,
  CommandVersionId,
  StandardId,
  StandardVersionId,
  PackageId,
  OrganizationId,
  ListActiveDistributedPackagesBySpaceCommand,
  ListDriftedPackagesByOrgCommand,
  ListDriftedPackagesByOrgResponse,
  ListDeploymentsByPackageCommand,
  ListDistributionsByCommandCommand,
  ListDistributionsByStandardCommand,
  ListDistributionsBySkillCommand,
  SkillId,
  SpaceId,
  NotifyArtefactsDistributionCommand,
  NotifyArtefactsDistributionResponse,
  NotifyDistributionCommand,
  NotifyDistributionResponse,
  PackmindLockFile,
  RemovePackageFromTargetsCommand,
  RemovePackageFromTargetsResponse,
  CodingAgent,
  GetDashboardKpiCommand,
  DashboardKpiResponse,
  GetDashboardNonLiveCommand,
  DashboardNonLiveResponse,
} from '@packmind/types';
import { DeploymentsService } from './deployments.service';
import { PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { TargetNotFoundError } from '@packmind/deployments';
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

  @Get(['recipe/:id', 'command/:id'])
  async getDeploymentCommand(
    @Param('orgId') organizationId: OrganizationId,
    @Param('id') id: CommandId,
    @Req() request: AuthenticatedRequest,
  ): Promise<Distribution[]> {
    this.logger.info(
      'GET /organizations/:orgId/deployments/recipe/:id - Fetching deployments by recipe ID',
      {
        recipeId: id,
        organizationId,
      },
    );

    try {
      const command: ListDistributionsByCommandCommand = {
        userId: request.user.userId,
        organizationId,
        recipeId: id,
      };

      const deployments =
        await this.deploymentsService.listDistributionsByCommand(command);

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

  @Get(['distributions/recipe/:id', 'distributions/command/:id'])
  async getDistributionsByCommandId(
    @Param('orgId') organizationId: OrganizationId,
    @Param('id') id: CommandId,
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
      const command: ListDistributionsByCommandCommand = {
        userId: request.user.userId,
        organizationId,
        recipeId: id,
      };

      const distributions =
        await this.deploymentsService.listDistributionsByCommand(command);

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

  @Get('distributions/skill/:id')
  async getDistributionsBySkillId(
    @Param('orgId') organizationId: OrganizationId,
    @Param('id') id: SkillId,
    @Req() request: AuthenticatedRequest,
  ): Promise<Distribution[]> {
    this.logger.info(
      'GET /organizations/:orgId/deployments/distributions/skill/:id - Fetching distributions by skill ID',
      {
        skillId: id,
        organizationId,
      },
    );

    try {
      const command: ListDistributionsBySkillCommand = {
        userId: request.user.userId,
        organizationId,
        skillId: id,
      };

      const distributions =
        await this.deploymentsService.listDistributionsBySkill(command);

      if (!distributions || distributions.length === 0) {
        this.logger.warn(
          'GET /organizations/:orgId/deployments/distributions/skill/:id - No distributions found',
          {
            skillId: id,
            organizationId,
          },
        );
        return [];
      }

      this.logger.info(
        'GET /organizations/:orgId/deployments/distributions/skill/:id - Distributions fetched successfully',
        {
          skillId: id,
          organizationId,
          count: distributions.length,
        },
      );

      return distributions;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/deployments/distributions/skill/:id - Failed to fetch distributions',
        {
          skillId: id,
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Post(['recipes/publish', 'commands/publish'])
  async publishCommands(
    @Param('orgId') organizationId: OrganizationId,
    @Body()
    body: {
      targetIds: TargetId[];
      commandVersionIds?: CommandVersionId[];
      recipeVersionIds?: CommandVersionId[];
    },
    @Req() request: AuthenticatedRequest,
  ): Promise<Distribution[]> {
    // Accept BOTH keys: new `commandVersionIds` wins, legacy
    // `recipeVersionIds` is the fallback.
    const commandVersionIds = body.commandVersionIds ?? body.recipeVersionIds;

    this.logger.info(
      'POST /organizations/:orgId/deployments/recipes/publish - Publishing recipes',
      {
        organizationId,
        targetIdsCount: body.targetIds.length,
        recipeVersionIdsCount: commandVersionIds?.length ?? 0,
      },
    );

    try {
      const command: PublishCommandsCommand = {
        userId: request.user.userId,
        organizationId,
        targetIds: body.targetIds,
        recipeVersionIds: commandVersionIds ?? [],
      };

      const deployments =
        await this.deploymentsService.publishCommands(command);

      this.logger.info(
        'POST /organizations/:orgId/deployments/recipes/publish - Recipes published successfully',
        {
          organizationId,
          deploymentsCount: deployments.length,
        },
      );

      return deployments;
    } catch (error) {
      if (error instanceof TargetNotFoundError) {
        throw new NotFoundException(error.message);
      }
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
  ): Promise<Distribution[]> {
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
      if (error instanceof TargetNotFoundError) {
        throw new NotFoundException(error.message);
      }
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
      if (error instanceof TargetNotFoundError) {
        throw new NotFoundException(error.message);
      }
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
  ): Promise<GetRenderModeConfigurationResponse> {
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

  @Post()
  async notifyDistribution(
    @Param('orgId') organizationId: OrganizationId,
    @Body()
    body: {
      distributedPackages: string[];
      gitRemoteUrl: string;
      gitBranch: string;
      relativePath: string;
      agents?: CodingAgent[];
    },
    @Req() request: AuthenticatedRequest,
  ): Promise<NotifyDistributionResponse> {
    this.logger.info(
      'POST /organizations/:orgId/deployments/ - Notifying distribution',
      {
        organizationId,
        distributedPackagesCount: body.distributedPackages.length,
        gitRemoteUrl: body.gitRemoteUrl,
        gitBranch: body.gitBranch,
        relativePath: body.relativePath,
        agents: body.agents,
      },
    );

    try {
      const command: NotifyDistributionCommand = {
        userId: request.user.userId,
        organizationId,
        distributedPackages: body.distributedPackages,
        gitRemoteUrl: body.gitRemoteUrl,
        gitBranch: body.gitBranch,
        relativePath: body.relativePath,
        agents: body.agents,
      };

      const response =
        await this.deploymentsService.notifyDistribution(command);

      this.logger.info(
        'POST /organizations/:orgId/deployments/ - Distribution notified successfully',
        {
          organizationId,
          deploymentId: response.deploymentId,
        },
      );

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/deployments/ - Failed to notify distribution',
        {
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Post('notify-artifacts-distribution')
  async notifyArtefactsDistribution(
    @Param('orgId') organizationId: OrganizationId,
    @Body()
    body: {
      gitRemoteUrl: string;
      gitBranch: string;
      relativePath: string;
      packmindLockFile: PackmindLockFile;
    },
    @Req() request: AuthenticatedRequest,
  ): Promise<NotifyArtefactsDistributionResponse> {
    this.logger.info(
      'POST /organizations/:orgId/deployments/notify-artifacts-distribution - Notifying artefacts distribution',
      {
        organizationId,
        gitRemoteUrl: body.gitRemoteUrl,
        gitBranch: body.gitBranch,
        relativePath: body.relativePath,
      },
    );

    try {
      const command: NotifyArtefactsDistributionCommand = {
        userId: request.user.userId,
        organizationId,
        gitRemoteUrl: body.gitRemoteUrl,
        gitBranch: body.gitBranch,
        relativePath: body.relativePath,
        packmindLockFile: body.packmindLockFile,
      };

      const response =
        await this.deploymentsService.notifyArtefactsDistribution(command);

      this.logger.info(
        'POST /organizations/:orgId/deployments/notify-artifacts-distribution - Artefacts distribution notified successfully',
        {
          organizationId,
          deploymentId: response.deploymentId,
        },
      );

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/deployments/notify-artifacts-distribution - Failed to notify artefacts distribution',
        {
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('dashboard/kpi')
  async getDashboardKpi(
    @Param('orgId') organizationId: OrganizationId,
    @Query('spaceId') spaceId: SpaceId,
    @Req() request: AuthenticatedRequest,
  ): Promise<DashboardKpiResponse> {
    this.logger.info('GET /organizations/:orgId/deployments/dashboard/kpi', {
      organizationId,
    });

    try {
      const command: GetDashboardKpiCommand = {
        userId: request.user.userId,
        organizationId,
        spaceId,
      };

      return await this.deploymentsService.getDashboardKpi(command);
    } catch (error) {
      this.logger.error(
        'GET /organizations/:orgId/deployments/dashboard/kpi - Failed',
        {
          organizationId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  @Get('dashboard/non-live')
  async getDashboardNonLive(
    @Param('orgId') organizationId: OrganizationId,
    @Query('spaceId') spaceId: SpaceId,
    @Req() request: AuthenticatedRequest,
  ): Promise<DashboardNonLiveResponse> {
    this.logger.info(
      'GET /organizations/:orgId/deployments/dashboard/non-live',
      { organizationId },
    );

    try {
      const command: GetDashboardNonLiveCommand = {
        userId: request.user.userId,
        organizationId,
        spaceId,
      };

      return await this.deploymentsService.getDashboardNonLive(command);
    } catch (error) {
      this.logger.error(
        'GET /organizations/:orgId/deployments/dashboard/non-live - Failed',
        {
          organizationId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  @Get('governance/drifted-packages')
  async listDriftedPackagesByOrg(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListDriftedPackagesByOrgResponse> {
    this.logger.info(
      'GET /organizations/:orgId/deployments/governance/drifted-packages',
      { organizationId },
    );

    try {
      const command: ListDriftedPackagesByOrgCommand = {
        userId: request.user.userId,
        organizationId,
      };

      const result =
        await this.deploymentsService.listDriftedPackagesByOrg(command);

      this.logger.info(
        'GET /organizations/:orgId/deployments/governance/drifted-packages - OK',
        { organizationId, count: result.length },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/deployments/governance/drifted-packages - Failed',
        { organizationId, error: errorMessage },
      );
      throw error;
    }
  }

  @Get('spaces/:spaceId/overview')
  async getSpaceOverview(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Req() request: AuthenticatedRequest,
  ): Promise<ActiveDistributedPackagesByTarget[]> {
    this.logger.info(
      'GET /organizations/:orgId/deployments/spaces/:spaceId/overview - Fetching space overview',
      { organizationId, spaceId },
    );

    try {
      const command: ListActiveDistributedPackagesBySpaceCommand = {
        userId: request.user.userId,
        organizationId,
        spaceId,
      };

      const result =
        await this.deploymentsService.listActiveDistributedPackagesBySpace(
          command,
        );

      this.logger.info(
        'GET /organizations/:orgId/deployments/spaces/:spaceId/overview - Space overview fetched successfully',
        { organizationId, spaceId, targetCount: result.length },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/deployments/spaces/:spaceId/overview - Failed to fetch space overview',
        { organizationId, spaceId, error: errorMessage },
      );
      throw error;
    }
  }

  @Delete('packages/:packageId/distributions')
  async removePackageFromTargets(
    @Param('orgId') organizationId: OrganizationId,
    @Param('packageId') packageId: PackageId,
    @Body() body: { targetIds: TargetId[] },
    @Req() request: AuthenticatedRequest,
  ): Promise<RemovePackageFromTargetsResponse> {
    this.logger.info(
      'DELETE /organizations/:orgId/deployments/packages/:packageId/distributions - Removing package from targets',
      {
        organizationId,
        packageId,
        targetIdsCount: body.targetIds.length,
      },
    );

    try {
      const command: RemovePackageFromTargetsCommand = {
        userId: request.user.userId,
        organizationId,
        packageId,
        targetIds: body.targetIds,
      };

      const response =
        await this.deploymentsService.removePackageFromTargets(command);

      this.logger.info(
        'DELETE /organizations/:orgId/deployments/packages/:packageId/distributions - Package removed from targets successfully',
        {
          organizationId,
          packageId,
          resultsCount: response.results.length,
          successCount: response.results.filter((r) => r.success).length,
          failureCount: response.results.filter((r) => !r.success).length,
        },
      );

      return response;
    } catch (error) {
      if (error instanceof TargetNotFoundError) {
        throw new NotFoundException(error.message);
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'DELETE /organizations/:orgId/deployments/packages/:packageId/distributions - Failed to remove package from targets',
        {
          organizationId,
          packageId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
