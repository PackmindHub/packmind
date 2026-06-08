import {
  MarketplaceId,
  NewGateway,
  OrganizationId,
  PackageId,
  PublishPackageOnMarketplaceResponse,
} from '@packmind/types';
import {
  IFindMarketplaceDistributionByIdUseCase,
  IGetPackageByIdUseCase,
  IListDeploymentsByPackage,
  IListDistributionsByRecipe,
  IListDistributionsByStandard,
  IListDistributionsBySkill,
  IListPackagesBySpaceUseCase,
  IListActiveDistributedPackagesBySpaceUseCase,
  ICreatePackageUseCase,
  IUpdatePackageUseCase,
  IDeletePackagesBatchUseCase,
  IAddArtefactsToPackageUseCase,
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

/**
 * Arguments passed to `publishPackageOnMarketplace`. The marketplace and
 * package live in different URL segments so we accept them as named fields
 * rather than re-using the backend command shape.
 */
export type PublishPackageOnMarketplaceArgs = {
  organizationId: OrganizationId;
  marketplaceId: MarketplaceId;
  packageId: PackageId;
};

export interface IDeploymentsGateway {
  listDeploymentsByPackageId: NewGateway<IListDeploymentsByPackage>;
  listDistributionsByRecipeId: NewGateway<IListDistributionsByRecipe>;
  listDistributionsByStandardId: NewGateway<IListDistributionsByStandard>;
  listDistributionsBySkillId: NewGateway<IListDistributionsBySkill>;
  listPackagesBySpace: NewGateway<IListPackagesBySpaceUseCase>;
  createPackage: NewGateway<ICreatePackageUseCase>;
  updatePackage: NewGateway<IUpdatePackageUseCase>;
  deletePackagesBatch: NewGateway<IDeletePackagesBatchUseCase>;
  addArtefactsToPackage: NewGateway<IAddArtefactsToPackageUseCase>;
  getPackageById: NewGateway<IGetPackageByIdUseCase>;
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
  /**
   * Publishes a Packmind package as a managed plugin on a linked marketplace.
   * Returns the freshly created `in_progress` row so the caller can poll for
   * the final status. Errors surface as `PackmindError` (mapped to a
   * `PublishFailureReason` by the mutation hook).
   */
  publishPackageOnMarketplace(
    args: PublishPackageOnMarketplaceArgs,
  ): Promise<PublishPackageOnMarketplaceResponse>;
  /**
   * Fetches a single `MarketplaceDistribution` row by id. Used by status
   * polling once the publish job has been enqueued. The endpoint always
   * resolves with HTTP 200 — `marketplaceDistribution` is `null` when the
   * row is missing or belongs to another organization.
   */
  findMarketplaceDistributionById: NewGateway<IFindMarketplaceDistributionByIdUseCase>;
}
