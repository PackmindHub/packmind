import { NewGateway } from '@packmind/types';
import {
  IGetDeploymentOverview,
  IGetPackageByIdUseCase,
  IGetStandardDeploymentOverview,
  IGetSkillDeploymentOverview,
  IListDeploymentsByPackage,
  IListDistributionsByRecipe,
  IListDistributionsByStandard,
  IListDistributionsBySkill,
  IListPackagesBySpaceUseCase,
  IListActiveDistributedPackagesBySpaceUseCase,
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
  IGetDashboardKpi,
  IGetDashboardNonLive,
} from '@packmind/types';

export interface IDeploymentsGateway {
  listDeploymentsByPackageId: NewGateway<IListDeploymentsByPackage>;
  listDistributionsByRecipeId: NewGateway<IListDistributionsByRecipe>;
  listDistributionsByStandardId: NewGateway<IListDistributionsByStandard>;
  listDistributionsBySkillId: NewGateway<IListDistributionsBySkill>;
  listPackagesBySpace: NewGateway<IListPackagesBySpaceUseCase>;
  createPackage: NewGateway<ICreatePackageUseCase>;
  updatePackage: NewGateway<IUpdatePackageUseCase>;
  deletePackagesBatch: NewGateway<IDeletePackagesBatchUseCase>;
  getPackageById: NewGateway<IGetPackageByIdUseCase>;
  getRecipesDeploymentOverview: NewGateway<IGetDeploymentOverview>;
  getStandardsDeploymentOverview: NewGateway<IGetStandardDeploymentOverview>;
  getSkillsDeploymentOverview: NewGateway<IGetSkillDeploymentOverview>;
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
  getDashboardKpi: NewGateway<IGetDashboardKpi>;
  getDashboardNonLive: NewGateway<IGetDashboardNonLive>;
  listActiveDistributedPackagesBySpace: NewGateway<IListActiveDistributedPackagesBySpaceUseCase>;
}
