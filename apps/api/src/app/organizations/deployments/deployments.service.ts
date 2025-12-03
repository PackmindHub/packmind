import { Injectable } from '@nestjs/common';
import {
  DeploymentOverview,
  Distribution,
  GetDeploymentOverviewCommand,
  GetStandardDeploymentOverviewCommand,
  ListDeploymentsByRecipeCommand,
  ListDeploymentsByStandardCommand,
  ListDeploymentsByPackageCommand,
  PublishArtifactsCommand,
  PublishArtifactsResponse,
  PublishRecipesCommand,
  PublishStandardsCommand,
  PublishPackagesCommand,
  RecipesDeployment,
  StandardsDeployment,
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
  IDeploymentPort,
} from '@packmind/types';
import { InjectDeploymentAdapter } from '../../shared/HexaInjection';

@Injectable()
export class DeploymentsService {
  constructor(
    @InjectDeploymentAdapter()
    private readonly deploymentAdapter: IDeploymentPort,
  ) {}

  async listDeploymentsByStandard(
    command: ListDeploymentsByStandardCommand,
  ): Promise<StandardsDeployment[]> {
    return this.deploymentAdapter.listDeploymentsByStandard(command);
  }

  async listDeploymentsByRecipe(
    command: ListDeploymentsByRecipeCommand,
  ): Promise<RecipesDeployment[]> {
    return this.deploymentAdapter.listDeploymentsByRecipe(command);
  }

  async listDeploymentsByPackage(
    command: ListDeploymentsByPackageCommand,
  ): Promise<Distribution[]> {
    return this.deploymentAdapter.listDeploymentsByPackage(command);
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
  ): Promise<RecipesDeployment[]> {
    const result: PublishArtifactsResponse =
      await this.deploymentAdapter.publishArtifacts({
        ...command,
        recipeVersionIds: command.recipeVersionIds,
        standardVersionIds: [],
      } as PublishArtifactsCommand);
    return result.recipeDeployments;
  }

  async publishStandards(
    command: PublishStandardsCommand,
  ): Promise<StandardsDeployment[]> {
    const result: PublishArtifactsResponse =
      await this.deploymentAdapter.publishArtifacts({
        ...command,
        recipeVersionIds: [],
        standardVersionIds: command.standardVersionIds,
      } as PublishArtifactsCommand);
    return result.standardDeployments;
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
}
