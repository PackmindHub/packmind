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
} from '@packmind/shared';
import { IDeploymentPort } from '@packmind/shared';
import { DeploymentsHexa } from '@packmind/deployments';

@Injectable()
export class DeploymentsService {
  private readonly deploymentAdapter: IDeploymentPort;

  constructor(private readonly deploymentsHexa: DeploymentsHexa) {
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
}
