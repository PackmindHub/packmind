import { Factory } from '@packmind/shared/test';
import { Recipe, createRecipeId } from '../src/domain/entities/Recipe';
import { createOrganizationId, createUserId } from '@packmind/accounts';
import { v4 as uuidv4 } from 'uuid';

export const recipeFactory: Factory<Recipe> = (recipe?: Partial<Recipe>) => {
  return {
    id: createRecipeId(uuidv4()),
    name: 'Test Recipe',
    slug: 'test-recipe',
    content: 'Test content',
    version: 1,
    organizationId: createOrganizationId(uuidv4()),
    userId: createUserId(uuidv4()),
    ...recipe,
  };
};
