import { Branded, brandedIdFactory } from '../brandedTypes';

export type RecipeId = Branded<'RecipeId'>;
export const createRecipeId = brandedIdFactory<RecipeId>();
