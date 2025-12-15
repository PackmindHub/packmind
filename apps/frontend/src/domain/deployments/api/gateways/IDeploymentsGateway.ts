import { NewGateway } from '@packmind/types';
import {
  IGetDeploymentOverview,
  IGetPackageByIdUseCase,
  IGetStandardDeploymentOverview,
  IListDeploymentsByPackage,
  IListDistributionsByRecipe,
  IListDistributionsByStandard,
  IListPackagesBySpaceUseCase,
  ICreatePackageUseCase,
  IUpdatePackageUseCase,
  IDeletePackagesBatchUseCase,
  IPublishRecipes,
  IPublishStandards,
  IPublishPackages,
  IGetTargetsByOrganizationUseCase,
  IGetTargetsByRepositoryUseCase,
  IAddTargetUseCase,
  IUpdateTargetUseCase,
  IDeleteTargetUseCase,
  IGetRenderModeConfigurationUseCase,
  IUpdateRenderModeConfigurationUseCase,
  IRemovePackageFromTargetsUseCase,
} from '@packmind/types';

export interface IDeploymentsGateway {
  listDeploymentsByPackageId: NewGateway<IListDeploymentsByPackage>;
  listDistributionsByRecipeId: NewGateway<IListDistributionsByRecipe>;
  listDistributionsByStandardId: NewGateway<IListDistributionsByStandard>;
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
  getTargetsByRepository: NewGateway<IGetTargetsByRepositoryUseCase>;
  addTarget: NewGateway<IAddTargetUseCase>;
  updateTarget: NewGateway<IUpdateTargetUseCase>;
  deleteTarget: NewGateway<IDeleteTargetUseCase>;
  getRenderModeConfiguration: NewGateway<IGetRenderModeConfigurationUseCase>;
  updateRenderModeConfiguration: NewGateway<IUpdateRenderModeConfigurationUseCase>;
  removePackageFromTargets: NewGateway<IRemovePackageFromTargetsUseCase>;
}
