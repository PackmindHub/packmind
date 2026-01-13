import { NewGateway, NewPackmindCommandBody } from '@packmind/types';
import { SpaceId, RecipeId } from '@packmind/types';
import { IUpdateTargetUseCase, IDeleteTargetUseCase } from '@packmind/types';
import {
  IAddTargetUseCase,
  IGetRenderModeConfigurationUseCase,
  IUpdateRenderModeConfigurationUseCase,
} from '@packmind/types';
import {
  IGetDeploymentOverview,
  IGetPackageByIdUseCase,
  IPublishRecipes,
  IPublishStandards,
  IPublishPackages,
  IGetStandardDeploymentOverview,
  IGetSkillDeploymentOverview,
  IListDeploymentsByPackage,
  IListDistributionsByRecipe,
  IListDistributionsByStandard,
  IListDistributionsBySkill,
  IListPackagesBySpaceUseCase,
  ICreatePackageUseCase,
  IUpdatePackageUseCase,
  IDeletePackagesBatchUseCase,
  IGetTargetsByOrganizationUseCase,
  IGetTargetsByRepositoryUseCase,
  IRemovePackageFromTargetsUseCase,
  PackageId,
  ListDeploymentsByPackageCommand,
  ListDistributionsByRecipeCommand,
  ListDistributionsByStandardCommand,
  ListDistributionsBySkillCommand,
  GetDeploymentOverviewCommand,
  GetStandardDeploymentOverviewCommand,
  GetSkillDeploymentOverviewCommand,
  PublishRecipesCommand,
  PublishStandardsCommand,
  PublishPackagesCommand,
  GetTargetsByOrganizationCommand,
  GetTargetsByRepositoryCommand,
  AddTargetCommand,
  UpdateTargetCommand,
  DeleteTargetCommand,
  GetRenderModeConfigurationCommand,
  UpdateRenderModeConfigurationCommand,
  RemovePackageFromTargetsCommand,
} from '@packmind/types';
import { OrganizationId } from '@packmind/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { IDeploymentsGateway } from './IDeploymentsGateway';

export class DeploymentsGatewayApi
  extends PackmindGateway
  implements IDeploymentsGateway
{
  constructor() {
    super('/organizations');
  }

  listDeploymentsByPackageId: NewGateway<IListDeploymentsByPackage> = async ({
    organizationId,
    packageId,
  }: NewPackmindCommandBody<ListDeploymentsByPackageCommand>) => {
    return this._api.get(
      `${this._endpoint}/${organizationId}/deployments/package/${packageId}`,
    );
  };

  listDistributionsByRecipeId: NewGateway<IListDistributionsByRecipe> = async ({
    organizationId,
    recipeId,
  }: NewPackmindCommandBody<ListDistributionsByRecipeCommand>) => {
    return this._api.get(
      `${this._endpoint}/${organizationId}/deployments/distributions/recipe/${recipeId}`,
    );
  };

  listDistributionsByStandardId: NewGateway<IListDistributionsByStandard> =
    async ({
      organizationId,
      standardId,
    }: NewPackmindCommandBody<ListDistributionsByStandardCommand>) => {
      return this._api.get(
        `${this._endpoint}/${organizationId}/deployments/distributions/standard/${standardId}`,
      );
    };

  listDistributionsBySkillId: NewGateway<IListDistributionsBySkill> = async ({
    organizationId,
    skillId,
  }: NewPackmindCommandBody<ListDistributionsBySkillCommand>) => {
    return this._api.get(
      `${this._endpoint}/${organizationId}/deployments/distributions/skill/${skillId}`,
    );
  };

  listPackagesBySpace: NewGateway<IListPackagesBySpaceUseCase> = async ({
    spaceId,
    organizationId,
  }: {
    spaceId: SpaceId;
    organizationId: OrganizationId;
  }) => {
    return this._api.get(
      `/organizations/${organizationId}/spaces/${spaceId}/packages`,
    );
  };

  createPackage: NewGateway<ICreatePackageUseCase> = async (params) => {
    const {
      spaceId,
      organizationId,
      name,
      description,
      recipeIds,
      standardIds,
      skillIds,
    } = params;
    return this._api.post(
      `/organizations/${organizationId}/spaces/${spaceId}/packages`,
      { name, description, recipeIds, standardIds, skillIds },
    );
  };

  updatePackage: NewGateway<IUpdatePackageUseCase> = async (params) => {
    const {
      packageId,
      organizationId,
      spaceId,
      name,
      description,
      recipeIds,
      standardIds,
      skillsIds,
    } = params;
    return this._api.patch(
      `/organizations/${organizationId}/spaces/${spaceId}/packages/${packageId}`,
      { name, description, recipeIds, standardIds, skillsIds },
    );
  };

  deletePackagesBatch: NewGateway<IDeletePackagesBatchUseCase> = async (
    params,
  ) => {
    const { packageIds, organizationId, spaceId } = params;
    return this._api.delete(
      `/organizations/${organizationId}/spaces/${spaceId}/packages`,
      { data: { packageIds } },
    );
  };

  getPackageById: NewGateway<IGetPackageByIdUseCase> = async ({
    packageId,
    organizationId,
    spaceId,
  }: {
    packageId: PackageId;
    organizationId: OrganizationId;
    spaceId: SpaceId;
  }) => {
    return this._api.get(
      `/organizations/${organizationId}/spaces/${spaceId}/packages/${packageId}`,
    );
  };

  getRecipesDeploymentOverview: NewGateway<IGetDeploymentOverview> = async ({
    organizationId,
  }: NewPackmindCommandBody<GetDeploymentOverviewCommand>) => {
    return this._api.get(
      `${this._endpoint}/${organizationId}/deployments/recipes/overview`,
    );
  };

  getStandardsDeploymentOverview: NewGateway<IGetStandardDeploymentOverview> =
    async ({
      organizationId,
    }: NewPackmindCommandBody<GetStandardDeploymentOverviewCommand>) => {
      return this._api.get(
        `${this._endpoint}/${organizationId}/deployments/standards/overview`,
      );
    };

  getSkillsDeploymentOverview: NewGateway<IGetSkillDeploymentOverview> =
    async ({
      organizationId,
    }: NewPackmindCommandBody<GetSkillDeploymentOverviewCommand>) => {
      return this._api.get(
        `${this._endpoint}/${organizationId}/deployments/skills/overview`,
      );
    };

  publishRecipes: NewGateway<IPublishRecipes> = async ({
    organizationId,
    targetIds,
    recipeVersionIds,
  }: NewPackmindCommandBody<PublishRecipesCommand>) => {
    return this._api.post(
      `${this._endpoint}/${organizationId}/deployments/recipes/publish`,
      { targetIds, recipeVersionIds },
    );
  };

  publishStandards: NewGateway<IPublishStandards> = async ({
    organizationId,
    targetIds,
    standardVersionIds,
  }: NewPackmindCommandBody<PublishStandardsCommand>) => {
    return this._api.post(
      `${this._endpoint}/${organizationId}/deployments/standards/publish`,
      { targetIds, standardVersionIds },
    );
  };

  publishPackages: NewGateway<IPublishPackages> = async ({
    organizationId,
    targetIds,
    packageIds,
  }: NewPackmindCommandBody<PublishPackagesCommand>) => {
    return this._api.post(
      `${this._endpoint}/${organizationId}/deployments/packages/publish`,
      { targetIds, packageIds },
    );
  };

  getTargetsByOrganization: NewGateway<IGetTargetsByOrganizationUseCase> =
    async ({
      organizationId,
    }: NewPackmindCommandBody<GetTargetsByOrganizationCommand>) => {
      return this._api.get(
        `${this._endpoint}/${organizationId}/deployments/targets`,
      );
    };

  getTargetsByRepository: NewGateway<IGetTargetsByRepositoryUseCase> = async ({
    organizationId,
    owner,
    repo,
  }: NewPackmindCommandBody<GetTargetsByRepositoryCommand>) => {
    return this._api.get(
      `${this._endpoint}/${organizationId}/deployments/targets/repository/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    );
  };

  addTarget: NewGateway<IAddTargetUseCase> = async ({
    organizationId,
    name,
    path,
    gitRepoId,
  }: NewPackmindCommandBody<AddTargetCommand>) => {
    return this._api.post(
      `${this._endpoint}/${organizationId}/deployments/targets`,
      { name, path, gitRepoId },
    );
  };

  updateTarget: NewGateway<IUpdateTargetUseCase> = async ({
    organizationId,
    targetId,
    name,
    path,
  }: NewPackmindCommandBody<UpdateTargetCommand>) => {
    return this._api.patch(
      `${this._endpoint}/${organizationId}/deployments/targets/${targetId}`,
      { name, path },
    );
  };

  deleteTarget: NewGateway<IDeleteTargetUseCase> = async ({
    organizationId,
    targetId,
  }: NewPackmindCommandBody<DeleteTargetCommand>) => {
    return this._api.delete(
      `${this._endpoint}/${organizationId}/deployments/targets/${targetId}`,
    );
  };

  getRenderModeConfiguration: NewGateway<IGetRenderModeConfigurationUseCase> =
    async ({
      organizationId,
    }: NewPackmindCommandBody<GetRenderModeConfigurationCommand>) => {
      return this._api.get(
        `${this._endpoint}/${organizationId}/deployments/renderModeConfiguration`,
      );
    };

  updateRenderModeConfiguration: NewGateway<IUpdateRenderModeConfigurationUseCase> =
    async ({
      organizationId,
      activeRenderModes,
    }: NewPackmindCommandBody<UpdateRenderModeConfigurationCommand>) => {
      return this._api.post(
        `${this._endpoint}/${organizationId}/deployments/renderModeConfiguration`,
        { activeRenderModes },
      );
    };

  removePackageFromTargets: NewGateway<IRemovePackageFromTargetsUseCase> =
    async ({
      organizationId,
      packageId,
      targetIds,
    }: NewPackmindCommandBody<RemovePackageFromTargetsCommand>) => {
      return this._api.delete(
        `${this._endpoint}/${organizationId}/deployments/packages/${packageId}/distributions`,
        { data: { targetIds } },
      );
    };
}
