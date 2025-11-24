import { NewGateway } from '@packmind/types';
import {
  IGetDeploymentOverview,
  IGetPackageByIdUseCase,
  IGetStandardDeploymentOverview,
  IListDeploymentsByRecipe,
  IListDeploymentsByStandard,
  IListPackagesBySpaceUseCase,
  ICreatePackageUseCase,
  IUpdatePackageUseCase,
  IDeletePackagesBatchUseCase,
  IPublishRecipes,
  IPublishStandards,
  IPublishPackages,
  IGetTargetsByOrganizationUseCase,
  IAddTargetUseCase,
  IUpdateTargetUseCase,
  IDeleteTargetUseCase,
  IGetRenderModeConfigurationUseCase,
  IUpdateRenderModeConfigurationUseCase,
} from '@packmind/types';

export interface IDeploymentsGateway {
  listDeploymentsByRecipeId: NewGateway<IListDeploymentsByRecipe>;
  listDeploymentsByStandardId: NewGateway<IListDeploymentsByStandard>;
  listPackagesBySpace: NewGateway<IListPackagesBySpaceUseCase>;
  createPackage: NewGateway<ICreatePackageUseCase>;
  updatePackage: NewGateway<IUpdatePackageUseCase>;
  deletePackagesBatch: NewGateway<IDeletePackagesBatchUseCase>;
  getPackageById: NewGateway<IGetPackageByIdUseCase>;
  getRecipesDeploymentOverview: NewGateway<IGetDeploymentOverview>;
  getStandardsDeploymentOverview: NewGateway<IGetStandardDeploymentOverview>;
  publishRecipes: NewGateway<IPublishRecipes>;
  publishStandards: NewGateway<IPublishStandards>;
  publishPackages: NewGateway<IPublishPackages>;
  getTargetsByOrganization: NewGateway<IGetTargetsByOrganizationUseCase>;
  addTarget: NewGateway<IAddTargetUseCase>;
  updateTarget: NewGateway<IUpdateTargetUseCase>;
  deleteTarget: NewGateway<IDeleteTargetUseCase>;
  getRenderModeConfiguration: NewGateway<IGetRenderModeConfigurationUseCase>;
  updateRenderModeConfiguration: NewGateway<IUpdateRenderModeConfigurationUseCase>;
}
