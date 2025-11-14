import { Injectable } from '@nestjs/common';
import {
  CreatePackageCommand,
  CreatePackageResponse,
  DeploymentOverview,
  GetDeploymentOverviewCommand,
  GetPackageByIdCommand,
  GetPackageByIdResponse,
  GetStandardDeploymentOverviewCommand,
  ListDeploymentsByRecipeCommand,
  ListDeploymentsByStandardCommand,
  ListPackagesBySpaceCommand,
  ListPackagesBySpaceResponse,
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
  IDeploymentPort,
} from '@packmind/types';
import { InjectDeploymentAdapter } from '../shared/HexaInjection';

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

  async listPackagesBySpace(
    command: ListPackagesBySpaceCommand,
  ): Promise<ListPackagesBySpaceResponse> {
    return this.deploymentAdapter.listPackagesBySpace(command);
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
    return this.deploymentAdapter.publishRecipes(command);
  }

  async publishStandards(
    command: PublishStandardsCommand,
  ): Promise<StandardsDeployment[]> {
    return this.deploymentAdapter.publishStandards(command);
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

  async createPackage(
    command: CreatePackageCommand,
  ): Promise<CreatePackageResponse> {
    return this.deploymentAdapter.createPackage(command);
  }

  async getPackageById(
    command: GetPackageByIdCommand,
  ): Promise<GetPackageByIdResponse> {
    return this.deploymentAdapter.getPackageById(command);
  }
}
