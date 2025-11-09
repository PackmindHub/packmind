import { Factory } from '@packmind/test-utils';
import {
  createSpaceId,
  createUserId,
  Recipe,
  createRecipeId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

export const recipeFactory: Factory<Recipe> = (recipe?: Partial<Recipe>) => {
  return {
    id: createRecipeId(uuidv4()),
    name: 'Test Recipe',
    slug: 'test-recipe',
    content: 'Test content',
    version: 1,
    userId: createUserId(uuidv4()),
    spaceId: createSpaceId(uuidv4()),
    ...recipe,
  };
};
