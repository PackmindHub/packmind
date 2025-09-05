// Centralized alert messages for Standards domain
export const STANDARD_MESSAGES = {
  validation: {
    nameRequired: 'Standard name is required',
    descriptionRequired: 'Standard description is required',
    rulesRequired: 'At least one rule is required',
  },
  success: {
    created: 'Standard created successfully!',
    updated: 'Standard updated successfully!',
    deleted: 'Standard deleted successfully!',
    deployed: 'Standard deployed successfully!',
  },
  error: {
    createFailed: 'Failed to create standard. Please try again.',
    updateFailed: 'Failed to update standard. Please try again.',
    deleteFailed: 'Failed to delete standard. Please try again.',
    deployFailed: 'Failed to deploy standard. Please try again.',
    loadFailed: 'Failed to load standard. Please try again.',
    loadRulesFailed: 'Failed to load rules. Please try again.',
  },
  loading: {
    creating: 'Creating standard...',
    updating: 'Updating standard...',
    deleting: 'Deleting standard...',
    deploying: 'Deploying standard...',
    loading: 'Loading standard...',
    loadingRules: 'Loading rules...',
  },
  confirmation: {
    deleteStandard: (name: string) =>
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
    deleteBatchStandards: (count: number) =>
      `Are you sure you want to delete ${count} standard(s)? This action cannot be undone.`,
  },
} as const;

// Type for message categories
export type StandardMessageCategory = keyof typeof STANDARD_MESSAGES;
export type StandardMessage<T extends StandardMessageCategory> =
  keyof (typeof STANDARD_MESSAGES)[T];
