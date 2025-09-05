import { Gateway } from '@packmind/shared';
import {
  IGetDeploymentOverviewUseCase,
  IGetStandardDeploymentOverviewUseCase,
  IListDeploymentsByRecipeUseCase,
  IListDeploymentsByStandardUseCase,
  IPublishRecipesUseCase,
  IPublishStandardsUseCase,
} from '@packmind/deployments';

export interface IDeploymentsGateway {
  listDeploymentsByRecipeId: Gateway<IListDeploymentsByRecipeUseCase>;
  listDeploymentsByStandardId: Gateway<IListDeploymentsByStandardUseCase>;
  getRecipesDeploymentOverview: Gateway<IGetDeploymentOverviewUseCase>;
  getStandardsDeploymentOverview: Gateway<IGetStandardDeploymentOverviewUseCase>;
  publishRecipes: Gateway<IPublishRecipesUseCase>;
  publishStandards: Gateway<IPublishStandardsUseCase>;
}
