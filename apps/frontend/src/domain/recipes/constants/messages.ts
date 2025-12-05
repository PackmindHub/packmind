// Centralized alert messages for Recipes domain
export const RECIPE_MESSAGES = {
  validation: {
    nameRequired: 'Recipe name is required',
    descriptionRequired: 'Recipe description is required',
    contentRequired: 'Recipe content is required',
  },
  success: {
    created: 'Recipe created successfully!',
    updated: 'Recipe updated successfully!',
    deleted: 'Recipe deleted successfully!',
    distributed: 'Recipe distributed successfully!',
  },
  error: {
    createFailed: 'Failed to create recipe. Please try again.',
    updateFailed: 'Failed to update recipe. Please try again.',
    deleteFailed: 'Failed to delete recipe. Please try again.',
    deployFailed: 'Failed to deploy recipe. Please try again.',
    loadFailed: 'Failed to load recipe. Please try again.',
  },
  loading: {
    creating: 'Creating recipe...',
    updating: 'Updating recipe...',
    deleting: 'Deleting recipe...',
    deploying: 'Deploying recipe...',
    loading: 'Loading recipe...',
  },
  confirmation: {
    deleteRecipe: (name: string) =>
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
    deleteBatchRecipes: (count: number) =>
      `Are you sure you want to delete ${count} recipe(s)? This action cannot be undone.`,
  },
} as const;

// Type for message categories
export type RecipeMessageCategory = keyof typeof RECIPE_MESSAGES;
export type RecipeMessage<T extends RecipeMessageCategory> =
  keyof (typeof RECIPE_MESSAGES)[T];
