import { NewGateway } from '@packmind/types';
import {
  IGetPackageByIdUseCase,
  IListDeploymentsByPackage,
  IListDistributionsByCommand,
  IListDistributionsByStandard,
  IListDistributionsBySkill,
  IListPackagesBySpaceUseCase,
  IListActiveDistributedPackagesBySpaceUseCase,
  IListDriftedPackagesByOrgUseCase,
  ICreatePackageUseCase,
  IUpdatePackageUseCase,
  IDeletePackagesBatchUseCase,
  IAddArtefactsToPackageUseCase,
  IPublishCommands,
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
  listDistributionsByCommandId: NewGateway<IListDistributionsByCommand>;
  listDistributionsByStandardId: NewGateway<IListDistributionsByStandard>;
  listDistributionsBySkillId: NewGateway<IListDistributionsBySkill>;
  listPackagesBySpace: NewGateway<IListPackagesBySpaceUseCase>;
  createPackage: NewGateway<ICreatePackageUseCase>;
  updatePackage: NewGateway<IUpdatePackageUseCase>;
  deletePackagesBatch: NewGateway<IDeletePackagesBatchUseCase>;
  addArtefactsToPackage: NewGateway<IAddArtefactsToPackageUseCase>;
  getPackageById: NewGateway<IGetPackageByIdUseCase>;
  publishCommands: NewGateway<IPublishCommands>;
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
  listDriftedPackagesByOrg: NewGateway<IListDriftedPackagesByOrgUseCase>;
}
