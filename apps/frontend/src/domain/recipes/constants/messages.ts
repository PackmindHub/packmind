// Centralized alert messages for Commands domain
export const RECIPE_MESSAGES = {
  validation: {
    nameRequired: 'Command name is required',
    descriptionRequired: 'Command description is required',
    contentRequired: 'Command content is required',
    slugInvalid:
      'Slug must contain only lowercase letters, numbers, and hyphens',
  },
  success: {
    created: 'Command created successfully!',
    updated: 'Command updated successfully!',
    deleted: 'Command deleted successfully!',
    distributed: 'Command distributed successfully!',
  },
  error: {
    createFailed: 'Failed to create command. Please try again.',
    updateFailed: 'Failed to update command. Please try again.',
    deleteFailed: 'Failed to delete command. Please try again.',
    deployFailed: 'Failed to deploy command. Please try again.',
    loadFailed: 'Failed to load command. Please try again.',
    slugAlreadyExists: 'A command with this slug already exists in this space.',
  },
  loading: {
    creating: 'Creating command...',
    updating: 'Updating command...',
    deleting: 'Deleting command...',
    deploying: 'Deploying command...',
    loading: 'Loading command...',
  },
  confirmation: {
    deleteRecipe: (name: string) =>
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
    deleteBatchRecipes: (count: number) =>
      `Are you sure you want to delete ${count} command(s)? This action cannot be undone.`,
  },
} as const;

// Type for message categories
export type RecipeMessageCategory = keyof typeof RECIPE_MESSAGES;
export type RecipeMessage<T extends RecipeMessageCategory> =
  keyof (typeof RECIPE_MESSAGES)[T];
