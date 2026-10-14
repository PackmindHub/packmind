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
  release: {
    notReleasedYet: 'Not released yet',
    /**
     * The package as it stands now, which is the one reading of it that has no
     * version string.
     *
     * Not "Current", which in a list reading `Current / 1.2.0 / 1.1.0` is as
     * easily read as naming 1.2.0. Not "Draft" either: this state is exactly
     * what the agents in every repository read today, so calling it a draft
     * would be untrue about what is shipped. What is true in both eras is that
     * it is the part of the package that is not in any release.
     */
    unreleased: 'Unreleased',
    basedOn: (version: string) => `based on ${version}`,
    unreleasedBasedOn: (version: string | null) =>
      version ? `Unreleased, based on ${version}` : 'Unreleased',
    no_components: 'Add at least one component',
    /**
     * Why the header's `Release` is dead, for a package whose components have
     * not moved since the last cut. The verdict had no sentence of its own
     * while the action was absent in this state and absence was the whole
     * explanation; it needs one now that the action stays and greys.
     */
    no_change: (currentVersion: string) =>
      `Nothing has changed since ${currentVersion}`,
    /**
     * Why it is dead under a release. A cut is taken from the package as it
     * stands, never from a version, so offering it under a bar reading 1.1.0
     * would read as cutting from there.
     */
    readingRelease: (version: string) =>
      `You are reading ${version}. Switch to Unreleased to create a release`,
    not_greater: (currentVersion: string) =>
      `Version must be greater than ${currentVersion}`,
    malformed: 'Version must follow X.Y.Z',
    not_an_increment: 'Version must follow X.Y.Z',
  },
} as const;

// Type for message categories
export type PackageMessageCategory = keyof typeof PACKAGE_MESSAGES;
export type PackageMessage<T extends PackageMessageCategory> =
  keyof (typeof PACKAGE_MESSAGES)[T];

/**
 * Get the reason message for a package release verdict.
 * Returns undefined for 'ready' verdict.
 */
export const getReleaseVerdictMessage = (
  verdict: string,
  currentVersion: string | null,
): string | undefined => {
  if (verdict === 'ready') {
    return undefined;
  }

  const messages = PACKAGE_MESSAGES.release as Record<string, unknown>;
  const message = messages[verdict];

  if (message === undefined) {
    return undefined;
  }

  if (typeof message === 'function') {
    if (currentVersion === null) {
      return undefined;
    }
    return message(currentVersion);
  }

  return String(message);
};
