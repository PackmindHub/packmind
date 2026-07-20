import { NewGateway, NewPackmindCommandBody } from '@packmind/types';
import {
  GetPackageByIdCommand,
  ListPackagesBySpaceCommand,
  PackageResponse,
} from '@packmind/types';
import {
  IListDeploymentsByPackage,
  IListDistributionsByCommand,
  IListDistributionsByStandard,
  IListDistributionsBySkill,
  IListActiveDistributedPackagesBySpaceUseCase,
  IListDriftedPackagesByOrgUseCase,
  ICreatePackageUseCase,
  IUpdatePackageUseCase,
  IDeletePackagesBatchUseCase,
  IAddArtefactsToPackageUseCase,
  IRemoveArtefactsFromPackageUseCase,
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
  // Return type widened to the PackageResponse wire DTO (superset of Package)
  // so the command-named `commands` twin is readable alongside `recipes`.
  listPackagesBySpace: (
    params: NewPackmindCommandBody<ListPackagesBySpaceCommand>,
  ) => Promise<{ packages: PackageResponse[] }>;
  createPackage: NewGateway<ICreatePackageUseCase>;
  updatePackage: NewGateway<IUpdatePackageUseCase>;
  deletePackagesBatch: NewGateway<IDeletePackagesBatchUseCase>;
  addArtefactsToPackage: NewGateway<IAddArtefactsToPackageUseCase>;
  removeArtefactsFromPackage: NewGateway<IRemoveArtefactsFromPackageUseCase>;
  // Return type widened to the PackageResponse wire DTO (superset of Package)
  // so the command-named `commands` twin is readable alongside `recipes`.
  getPackageById: (
    params: NewPackmindCommandBody<GetPackageByIdCommand>,
  ) => Promise<{ package: PackageResponse }>;
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
