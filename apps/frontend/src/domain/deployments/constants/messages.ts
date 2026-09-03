// Centralized alert messages for Packages (Deployments) domain
export const PACKAGE_MESSAGES = {
  validation: {
    nameRequired: 'Package name is required',
    descriptionRequired: 'Package description is required',
  },
  success: {
    created: 'Package created successfully!',
    updated: 'Package updated successfully!',
    deleted: 'Package deleted successfully!',
  },
  error: {
    createFailed: 'Failed to create package. Please try again.',
    updateFailed: 'Failed to update package. Please try again.',
    deleteFailed: 'Failed to delete package. Please try again.',
    loadFailed: 'Failed to load package. Please try again.',
  },
  loading: {
    creating: 'Creating package...',
    updating: 'Updating package...',
    deleting: 'Deleting package...',
    loading: 'Loading package...',
  },
  confirmation: {
    deletePackage: (name: string) =>
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
    deleteBatchPackages: (count: number) =>
      `Are you sure you want to delete ${count} package(s)? This action cannot be undone.`,
  },
  removal: {
    dialogTitle: 'Remove from destinations',
    selectTargetsPrompt:
      'Select the distributions to remove this package from:',
    confirmMessage: (packageName: string, count: number) =>
      `Are you sure you want to remove "${packageName}" from ${count} distribution${count === 1 ? '' : 's'}?`,
    noDistributions: 'This package is not distributed anywhere',
    buttonLabel: 'Remove from destinations',
    confirmButtonLabel: 'Remove',
    cancelButtonLabel: 'Cancel',
    backButtonLabel: 'Back',
  },
  distribution: {
    notConfigured:
      'This target is not configured for in-app distribution. Use `packmind install` to distribute.',
    upToDate: 'This package is up to date',
  },
} as const;

// Type for message categories
export type PackageMessageCategory = keyof typeof PACKAGE_MESSAGES;
export type PackageMessage<T extends PackageMessageCategory> =
  keyof (typeof PACKAGE_MESSAGES)[T];
