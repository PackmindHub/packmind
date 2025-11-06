import { Gateway } from '@packmind/types';
import {
  IGetDeploymentOverview,
  IGetStandardDeploymentOverview,
  IListDeploymentsByRecipe,
  IListDeploymentsByStandard,
  IPublishRecipes,
  IPublishStandards,
  IGetTargetsByGitRepoUseCase,
  IGetTargetsByRepositoryUseCase,
  IGetTargetsByOrganizationUseCase,
  IAddTargetUseCase,
  IUpdateTargetUseCase,
  IDeleteTargetUseCase,
  IGetRenderModeConfigurationUseCase,
  IUpdateRenderModeConfigurationUseCase,
} from '@packmind/shared';

export interface IDeploymentsGateway {
  listDeploymentsByRecipeId: Gateway<IListDeploymentsByRecipe>;
  listDeploymentsByStandardId: Gateway<IListDeploymentsByStandard>;
  getRecipesDeploymentOverview: Gateway<IGetDeploymentOverview>;
  getStandardsDeploymentOverview: Gateway<IGetStandardDeploymentOverview>;
  publishRecipes: Gateway<IPublishRecipes>;
  publishStandards: Gateway<IPublishStandards>;
  getTargetsByGitRepo: Gateway<IGetTargetsByGitRepoUseCase>;
  getTargetsByRepository: Gateway<IGetTargetsByRepositoryUseCase>;
  getTargetsByOrganization: Gateway<IGetTargetsByOrganizationUseCase>;
  addTarget: Gateway<IAddTargetUseCase>;
  updateTarget: Gateway<IUpdateTargetUseCase>;
  deleteTarget: Gateway<IDeleteTargetUseCase>;
  getRenderModeConfiguration: Gateway<IGetRenderModeConfigurationUseCase>;
  updateRenderModeConfiguration: Gateway<IUpdateRenderModeConfigurationUseCase>;
}
