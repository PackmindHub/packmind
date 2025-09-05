// Centralized alert messages for Git domain
export const GIT_MESSAGES = {
  validation: {
    providerRequired: 'Git provider is required',
    repositoryRequired: 'Repository is required',
    sourceRequired: 'Source is required',
  },
  success: {
    providerCreated: 'Git provider created successfully!',
    providerUpdated: 'Git provider updated successfully!',
    providerDeleted: 'Git provider deleted successfully!',
    repositoryAdded: 'Repository added successfully!',
    repositoryRemoved: 'Repository removed successfully!',
  },
  error: {
    providerCreateFailed: 'Failed to create git provider. Please try again.',
    providerUpdateFailed: 'Failed to update git provider. Please try again.',
    providerDeleteFailed: 'Failed to delete git provider. Please try again.',
    repositoryAddFailed: 'Failed to add repository. Please try again.',
    repositoryRemoveFailed: 'Failed to remove repository. Please try again.',
    loadFailed: 'Failed to load git data. Please try again.',
  },
  loading: {
    creating: 'Creating git provider...',
    updating: 'Updating git provider...',
    deleting: 'Deleting git provider...',
    adding: 'Adding repository...',
    removing: 'Removing repository...',
    loading: 'Loading git data...',
  },
  confirmation: {
    deleteProvider: (source: string) =>
      `Are you sure you want to delete the git provider "${source}"? This will also remove all associated repositories.`,
    removeRepository: (owner: string, repo: string) =>
      `Are you sure you want to remove the repository "${owner}/${repo}" from this provider?`,
  },
} as const;

// Type for message categories
export type GitMessageCategory = keyof typeof GIT_MESSAGES;
export type GitMessage<T extends GitMessageCategory> =
  keyof (typeof GIT_MESSAGES)[T];
