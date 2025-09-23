import {
  IListDeploymentsByRecipe,
  IGetStandardDeploymentOverview,
  IListDeploymentsByStandard,
  IGetDeploymentOverview,
  IPublishRecipes,
  IPublishStandards,
  IGetTargetsByRepositoryUseCase,
  IGetTargetsByOrganizationUseCase,
  IAddTargetUseCase,
  IUpdateTargetUseCase,
  IDeleteTargetUseCase,
  StandardId,
  Gateway,
  GitRepoId,
} from '@packmind/shared';
import { OrganizationId } from '@packmind/accounts';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { IDeploymentsGateway } from './IDeploymentsGateway';

export class DeploymentsGatewayApi
  extends PackmindGateway
  implements IDeploymentsGateway
{
  constructor() {
    super('/deployments');
  }

  listDeploymentsByRecipeId: Gateway<IListDeploymentsByRecipe> = async ({
    recipeId,
  }) => {
    return this._api.get(`${this._endpoint}/recipe/${recipeId}`);
  };

  listDeploymentsByStandardId: Gateway<IListDeploymentsByStandard> = async ({
    standardId,
  }: {
    standardId: StandardId;
  }) => {
    return this._api.get(`${this._endpoint}/standard/${standardId}`);
  };

  getRecipesDeploymentOverview: Gateway<IGetDeploymentOverview> = async () => {
    return this._api.get(`${this._endpoint}/recipes/overview`);
  };

  getStandardsDeploymentOverview: Gateway<IGetStandardDeploymentOverview> =
    async () => {
      return this._api.get(`${this._endpoint}/standards/overview`);
    };

  publishRecipes: Gateway<IPublishRecipes> = async (command) => {
    return this._api.post(`${this._endpoint}/recipes/publish`, command);
  };

  publishStandards: Gateway<IPublishStandards> = async (command) => {
    return this._api.post(`${this._endpoint}/standards/publish`, command);
  };

  getTargetsByRepository: Gateway<IGetTargetsByRepositoryUseCase> = async ({
    gitRepoId,
  }: {
    gitRepoId: GitRepoId;
  }) => {
    return this._api.get(`/targets/repository/${gitRepoId}`);
  };

  getTargetsByOrganization: Gateway<IGetTargetsByOrganizationUseCase> = async (
    params: Record<string, unknown>, // TODO: Fix type mismatch - should include organizationId in command
  ) => {
    const { organizationId } = params as { organizationId: OrganizationId };
    return this._api.get(`/targets/organization/${organizationId}`);
  };

  addTarget: Gateway<IAddTargetUseCase> = async (command) => {
    return this._api.post(`/targets`, command);
  };

  updateTarget: Gateway<IUpdateTargetUseCase> = async (command) => {
    return this._api.put(`/targets/${command.targetId}`, command);
  };

  deleteTarget: Gateway<IDeleteTargetUseCase> = async (command) => {
    return this._api.delete(`/targets/${command.targetId}`);
  };
}
