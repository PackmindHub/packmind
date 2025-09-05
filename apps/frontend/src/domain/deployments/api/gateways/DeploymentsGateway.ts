import {
  IListDeploymentsByRecipe,
  IGetStandardDeploymentOverview,
  IListDeploymentsByStandard,
  IGetDeploymentOverview,
  IPublishRecipes,
  IPublishStandards,
  StandardId,
} from '@packmind/shared';
import { Gateway } from '@packmind/shared';
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
}
