import { Gateway } from '@packmind/types';
import { StandardId } from '@packmind/types';
import { IUpdateTargetUseCase, IDeleteTargetUseCase } from '@packmind/types';
import {
  IAddTargetUseCase,
  IGetRenderModeConfigurationUseCase,
  IUpdateRenderModeConfigurationUseCase,
  GitRepoId,
} from '@packmind/types';
import {
  IGetDeploymentOverview,
  IPublishRecipes,
  IPublishStandards,
  IListDeploymentsByRecipe,
  IGetStandardDeploymentOverview,
  IListDeploymentsByStandard,
  IGetTargetsByGitRepoUseCase,
  IGetTargetsByRepositoryUseCase,
  IGetTargetsByOrganizationUseCase,
  UpdateTargetCommand,
  DeleteTargetCommand,
  DeleteTargetResponse,
} from '@packmind/types';
import { OrganizationId } from '@packmind/types';
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

  getTargetsByGitRepo: Gateway<IGetTargetsByGitRepoUseCase> = async ({
    gitRepoId,
  }: {
    gitRepoId: GitRepoId;
  }) => {
    return this._api.get(`/targets/git-repo/${gitRepoId}`);
  };

  getTargetsByRepository: Gateway<IGetTargetsByRepositoryUseCase> = async ({
    owner,
    repo,
  }: {
    owner: string;
    repo: string;
  }) => {
    return this._api.get(
      `/targets/repository/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    );
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
    const cmd = command as UpdateTargetCommand;
    return this._api.put(`/targets/${cmd.targetId}`, command);
  };

  deleteTarget: Gateway<IDeleteTargetUseCase> = async (command) => {
    const cmd = command as DeleteTargetCommand;
    return this._api.delete(
      `/targets/${cmd.targetId}`,
    ) as Promise<DeleteTargetResponse>;
  };

  getRenderModeConfiguration: Gateway<IGetRenderModeConfigurationUseCase> =
    async () => {
      return this._api.get(`${this._endpoint}/renderModeConfiguration`);
    };

  updateRenderModeConfiguration: Gateway<IUpdateRenderModeConfigurationUseCase> =
    async (command) => {
      return this._api.post(
        `${this._endpoint}/renderModeConfiguration`,
        command,
      );
    };
}
