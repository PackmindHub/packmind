import {
  Controller,
  Delete,
  Get,
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
  ListDistributionsByCommandCommand,
  ListDistributionsByCommandResponse,
  ListDistributionsByStandardResponse,
  ListDistributionsBySkillResponse,
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
  ): Promise<ListDistributionsByCommandResponse> {
    this.logger.info(
      'GET /organizations/:orgId/deployments/recipe/:id - Fetching deployments by recipe ID',
      {
        recipeId: id,
        organizationId,
      },
    );

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
  }

  @Get(['distributions/recipe/:id', 'distributions/command/:id'])
  async getDistributionsByCommandId(
    @Param('orgId') organizationId: OrganizationId,
    @Param('id') id: CommandId,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListDistributionsByCommandResponse> {
    this.logger.info(
      'GET /organizations/:orgId/deployments/distributions/recipe/:id - Fetching distributions by recipe ID',
      {
        recipeId: id,
        organizationId,
      },
    );

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
  }

  @Get('distributions/standard/:id')
  async getDistributionsByStandardId(
    @Param('orgId') organizationId: OrganizationId,
    @Param('id') id: StandardId,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListDistributionsByStandardResponse> {
    this.logger.info(
      'GET /organizations/:orgId/deployments/distributions/standard/:id - Fetching distributions by standard ID',
      {
        standardId: id,
        organizationId,
      },
    );

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
  }

  @Get('distributions/skill/:id')
  async getDistributionsBySkillId(
    @Param('orgId') organizationId: OrganizationId,
    @Param('id') id: SkillId,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListDistributionsBySkillResponse> {
    this.logger.info(
      'GET /organizations/:orgId/deployments/distributions/skill/:id - Fetching distributions by skill ID',
      {
        skillId: id,
        organizationId,
      },
    );

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

    const command: PublishCommandsCommand = {
      userId: request.user.userId,
      organizationId,
      targetIds: body.targetIds,
      commandVersionIds: commandVersionIds ?? [],
    };

    const deployments = await this.deploymentsService.publishCommands(command);

    this.logger.info(
      'POST /organizations/:orgId/deployments/recipes/publish - Recipes published successfully',
      {
        organizationId,
        deploymentsCount: deployments.length,
      },
    );

    return deployments;
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

    const command: PublishStandardsCommand = {
      userId: request.user.userId,
      organizationId,
      targetIds: body.targetIds,
      standardVersionIds: body.standardVersionIds,
    };

    const deployments = await this.deploymentsService.publishStandards(command);

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

    const command: PublishPackagesCommand = {
      userId: request.user.userId,
      organizationId,
      targetIds: body.targetIds,
      packageIds: body.packageIds,
    };

    const deployments = await this.deploymentsService.publishPackages(command);

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

    const command: NotifyDistributionCommand = {
      userId: request.user.userId,
      organizationId,
      distributedPackages: body.distributedPackages,
      gitRemoteUrl: body.gitRemoteUrl,
      gitBranch: body.gitBranch,
      relativePath: body.relativePath,
      agents: body.agents,
    };

    const response = await this.deploymentsService.notifyDistribution(command);

    this.logger.info(
      'POST /organizations/:orgId/deployments/ - Distribution notified successfully',
      {
        organizationId,
        deploymentId: response.deploymentId,
      },
    );

    return response;
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

    const command: GetDashboardKpiCommand = {
      userId: request.user.userId,
      organizationId,
      spaceId,
    };

    return await this.deploymentsService.getDashboardKpi(command);
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

    const command: GetDashboardNonLiveCommand = {
      userId: request.user.userId,
      organizationId,
      spaceId,
    };

    return await this.deploymentsService.getDashboardNonLive(command);
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
  }
}
