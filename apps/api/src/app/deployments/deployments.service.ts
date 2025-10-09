import { Injectable } from '@nestjs/common';
import {
  DeploymentOverview,
  GetDeploymentOverviewCommand,
  GetStandardDeploymentOverviewCommand,
  ListDeploymentsByRecipeCommand,
  ListDeploymentsByStandardCommand,
  PublishRecipesCommand,
  PublishStandardsCommand,
  RecipesDeployment,
  StandardsDeployment,
  StandardDeploymentOverview,
  UpdateRenderModeConfigurationCommand,
  RenderModeConfiguration,
  GetRenderModeConfigurationCommand,
  GetRenderModeConfigurationResult,
} from '@packmind/shared';
import { IDeploymentPort } from '@packmind/shared';
import { DeploymentsHexa } from '@packmind/deployments';
import { AccountsHexa } from '@packmind/accounts';

@Injectable()
export class DeploymentsService {
  private readonly deploymentAdapter: IDeploymentPort;

  constructor(
    private readonly deploymentsHexa: DeploymentsHexa,
    private readonly accountsHexa: AccountsHexa,
  ) {
    this.deploymentsHexa.setAccountProviders(
      this.accountsHexa.getUserProvider(),
      this.accountsHexa.getOrganizationProvider(),
    );
    this.deploymentAdapter = this.deploymentsHexa.getDeploymentsUseCases();
  }

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
}
