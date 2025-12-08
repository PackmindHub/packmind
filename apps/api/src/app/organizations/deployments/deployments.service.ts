import { Injectable } from '@nestjs/common';
import {
  DeploymentOverview,
  Distribution,
  GetDeploymentOverviewCommand,
  GetStandardDeploymentOverviewCommand,
  ListDeploymentsByPackageCommand,
  ListDistributionsByRecipeCommand,
  ListDistributionsByStandardCommand,
  PublishArtifactsCommand,
  PublishArtifactsResponse,
  PublishRecipesCommand,
  PublishStandardsCommand,
  PublishPackagesCommand,
  PackagesDeployment,
  StandardDeploymentOverview,
  UpdateRenderModeConfigurationCommand,
  RenderModeConfiguration,
  GetRenderModeConfigurationCommand,
  GetRenderModeConfigurationResult,
  CreatePackageCommand,
  CreatePackageResponse,
  UpdatePackageCommand,
  UpdatePackageResponse,
  GetPackageByIdCommand,
  GetPackageByIdResponse,
  DeletePackagesBatchCommand,
  DeletePackagesBatchResponse,
  ListPackagesBySpaceCommand,
  ListPackagesBySpaceResponse,
  NotifyDistributionCommand,
  NotifyDistributionResponse,
  IDeploymentPort,
} from '@packmind/types';
import { InjectDeploymentAdapter } from '../../shared/HexaInjection';

@Injectable()
export class DeploymentsService {
  constructor(
    @InjectDeploymentAdapter()
    private readonly deploymentAdapter: IDeploymentPort,
  ) {}

  async listDeploymentsByPackage(
    command: ListDeploymentsByPackageCommand,
  ): Promise<Distribution[]> {
    return this.deploymentAdapter.listDeploymentsByPackage(command);
  }

  async listDistributionsByRecipe(
    command: ListDistributionsByRecipeCommand,
  ): Promise<Distribution[]> {
    return this.deploymentAdapter.listDistributionsByRecipe(command);
  }

  async listDistributionsByStandard(
    command: ListDistributionsByStandardCommand,
  ): Promise<Distribution[]> {
    return this.deploymentAdapter.listDistributionsByStandard(command);
  }

  async getStandardDeploymentOverview(
    command: GetStandardDeploymentOverviewCommand,
  ): Promise<StandardDeploymentOverview> {
    return this.deploymentAdapter.getStandardDeploymentOverview(command);
  }

  async getDeploymentOverview(
    command: GetDeploymentOverviewCommand,
  ): Promise<DeploymentOverview> {
    return this.deploymentAdapter.getDeploymentOverview(command);
  }

  async publishRecipes(
    command: PublishRecipesCommand,
  ): Promise<Distribution[]> {
    const result: PublishArtifactsResponse =
      await this.deploymentAdapter.publishArtifacts({
        ...command,
        recipeVersionIds: command.recipeVersionIds,
        standardVersionIds: [],
        packagesSlugs: [],
      } as PublishArtifactsCommand);
    return result.distributions;
  }

  async publishStandards(
    command: PublishStandardsCommand,
  ): Promise<Distribution[]> {
    const result: PublishArtifactsResponse =
      await this.deploymentAdapter.publishArtifacts({
        ...command,
        recipeVersionIds: [],
        standardVersionIds: command.standardVersionIds,
        packagesSlugs: [],
      } as PublishArtifactsCommand);
    return result.distributions;
  }

  async publishPackages(
    command: PublishPackagesCommand,
  ): Promise<PackagesDeployment[]> {
    return this.deploymentAdapter.publishPackages(command);
  }

  async getRenderModeConfiguration(
    command: GetRenderModeConfigurationCommand,
  ): Promise<GetRenderModeConfigurationResult> {
    return this.deploymentAdapter.getRenderModeConfiguration(command);
  }

  async updateRenderModeConfiguration(
    command: UpdateRenderModeConfigurationCommand,
  ): Promise<RenderModeConfiguration> {
    return this.deploymentAdapter.updateRenderModeConfiguration(command);
  }

  async listPackagesBySpace(
    command: ListPackagesBySpaceCommand,
  ): Promise<ListPackagesBySpaceResponse> {
    return this.deploymentAdapter.listPackagesBySpace(command);
  }

  async createPackage(
    command: CreatePackageCommand,
  ): Promise<CreatePackageResponse> {
    return this.deploymentAdapter.createPackage(command);
  }

  async updatePackage(
    command: UpdatePackageCommand,
  ): Promise<UpdatePackageResponse> {
    return this.deploymentAdapter.updatePackage(command);
  }

  async getPackageById(
    command: GetPackageByIdCommand,
  ): Promise<GetPackageByIdResponse> {
    return this.deploymentAdapter.getPackageById(command);
  }

  async deletePackagesBatch(
    command: DeletePackagesBatchCommand,
  ): Promise<DeletePackagesBatchResponse> {
    return this.deploymentAdapter.deletePackagesBatch(command);
  }

  async notifyDistribution(
    command: NotifyDistributionCommand,
  ): Promise<NotifyDistributionResponse> {
    return this.deploymentAdapter.notifyDistribution(command);
  }
}
