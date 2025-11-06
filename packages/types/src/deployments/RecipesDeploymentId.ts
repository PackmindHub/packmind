import { Branded, brandedIdFactory } from '../brandedTypes';

export type RecipesDeploymentId = Branded<'RecipesDeploymentId'>;
export const createRecipesDeploymentId =
  brandedIdFactory<RecipesDeploymentId>();
