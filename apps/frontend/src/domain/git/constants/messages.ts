// Centralized alert messages for Git domain
export const GIT_MESSAGES = {
  validation: {
    connectionRequired: 'Git connection is required',
    repositoryRequired: 'Repository is required',
    sourceRequired: 'Source is required',
  },
  success: {
    connectionCreated: 'Git connection created successfully!',
    connectionUpdated: 'Git connection updated successfully!',
    connectionDeleted: 'Git connection deleted successfully!',
    repositoryAdded: 'Repository added successfully!',
    repositoryRemoved: 'Repository removed successfully!',
  },
  error: {
    connectionCreateFailed:
      'Failed to create git connection. Please try again.',
    connectionUpdateFailed:
      'Failed to update git connection. Please try again.',
    connectionDeleteFailed:
      'Failed to delete git connection. Please try again.',
    repositoryAddFailed: 'Failed to add repository. Please try again.',
    repositoryRemoveFailed: 'Failed to remove repository. Please try again.',
    loadFailed: 'Failed to load git data. Please try again.',
  },
  loading: {
    creating: 'Creating git connection...',
    updating: 'Updating git connection...',
    deleting: 'Deleting git connection...',
    adding: 'Adding repository...',
    removing: 'Removing repository...',
    loading: 'Loading git data...',
  },
  confirmation: {
    deleteConnection: (source: string) =>
      `Are you sure you want to delete the git connection "${source}"? This will also remove all associated repositories.`,
    removeRepository: (owner: string, repo: string) =>
      `Are you sure you want to remove the repository "${owner}/${repo}" from this connection?`,
  },
} as const;

// Type for message categories
export type GitMessageCategory = keyof typeof GIT_MESSAGES;
export type GitMessage<T extends GitMessageCategory> =
  keyof (typeof GIT_MESSAGES)[T];
