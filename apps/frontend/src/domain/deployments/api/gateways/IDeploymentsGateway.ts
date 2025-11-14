import { Gateway, NewGateway } from '@packmind/types';
import {
  IGetDeploymentOverview,
  IGetStandardDeploymentOverview,
  IListDeploymentsByRecipe,
  IListDeploymentsByStandard,
  IListPackagesBySpaceUseCase,
  ICreatePackageUseCase,
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
} from '@packmind/types';

export interface IDeploymentsGateway {
  listDeploymentsByRecipeId: Gateway<IListDeploymentsByRecipe>;
  listDeploymentsByStandardId: Gateway<IListDeploymentsByStandard>;
  listPackagesBySpace: NewGateway<IListPackagesBySpaceUseCase>;
  createPackage: NewGateway<ICreatePackageUseCase>;
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
