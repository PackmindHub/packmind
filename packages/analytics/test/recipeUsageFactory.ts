import { Factory } from '@packmind/test-utils';
import { createRecipeId, createUserId } from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import {
  RecipeUsage,
  createRecipeUsageId,
} from '../src/domain/entities/RecipeUsage';

export const recipeUsageFactory: Factory<RecipeUsage> = (
  usage?: Partial<RecipeUsage>,
) => {
  return {
    id: createRecipeUsageId(uuidv4()),
    recipeId: createRecipeId(uuidv4()),
    usedAt: new Date('2023-01-01T10:00:00Z'),
    aiAgent: 'Cursor',
    gitRepoId: null,
    userId: createUserId(uuidv4()),
    targetId: null,
    ...usage,
  };
};
