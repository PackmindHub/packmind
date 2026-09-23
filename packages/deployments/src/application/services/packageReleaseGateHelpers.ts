import { PackageReleaseDetail } from '@packmind/types';

/** One component of a package, resolved to its current latest version. */
export type PackageComponentSnapshot = {
  id: string;
  latestVersionId: string | null;
};

/**
 * The package as the gate sees it: its details and its three component
 * families, each already resolved to a latest version by the caller.
 */
export type PackageGateSnapshot = {
  name: string;
  description: string;
  recipes: PackageComponentSnapshot[];
  standards: PackageComponentSnapshot[];
  skills: PackageComponentSnapshot[];
};

/**
 * Compares package names using trim() then case-insensitive comparison.
 */
export const packageNameMatches = (a: string, b: string): boolean => {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
};

/**
 * Compares package descriptions using trim() then exact (case-sensitive) comparison.
 *
 * NOTE: This is intentionally different from packageNameMatches.
 * Case sensitivity in descriptions is deliberate — capitalizing a sentence
 * or lowercasing a product name is an edit a writer meant and should be
 * publishable as a correction.
 */
export const packageDescriptionMatches = (a: string, b: string): boolean => {
  return a.trim() === b.trim();
};

/**
 * Compares component lists as unordered sets of `${family}:${id}` keys.
 *
 * Order and arrival sequence are invisible; only the set of components matters.
 */
export const componentListMatches = (
  pkg: PackageGateSnapshot,
  release: PackageReleaseDetail,
): boolean => {
  const currentSet = new Set<string>();
  pkg.recipes.forEach((c) => currentSet.add(`recipe:${c.id}`));
  pkg.standards.forEach((c) => currentSet.add(`standard:${c.id}`));
  pkg.skills.forEach((c) => currentSet.add(`skill:${c.id}`));

  const releaseSet = new Set<string>();
  release.recipeVersions.forEach((v) => releaseSet.add(`recipe:${v.recipeId}`));
  release.standardVersions.forEach((v) =>
    releaseSet.add(`standard:${v.standardId}`),
  );
  release.skillVersions.forEach((v) => releaseSet.add(`skill:${v.skillId}`));

  if (currentSet.size !== releaseSet.size) {
    return false;
  }

  for (const key of currentSet) {
    if (!releaseSet.has(key)) {
      return false;
    }
  }

  return true;
};

/**
 * Compares each component's latest version id against the id the release pinned.
 *
 * May assume it is only meaningful when component lists already match; still,
 * does not throw when they do not (a component present on one side and absent
 * on the other simply does not match).
 */
export const pinnedVersionsMatch = (
  pkg: PackageGateSnapshot,
  release: PackageReleaseDetail,
): boolean => {
  // Build maps of component id to pinned version id from the release
  const releasePinnedVersions = new Map<string, string>();

  release.recipeVersions.forEach((v) => {
    releasePinnedVersions.set(`recipe:${v.recipeId}`, v.id);
  });
  release.standardVersions.forEach((v) => {
    releasePinnedVersions.set(`standard:${v.standardId}`, v.id);
  });
  release.skillVersions.forEach((v) => {
    releasePinnedVersions.set(`skill:${v.skillId}`, v.id);
  });

  // Check if every current component has the same latest version id as what was pinned
  for (const recipe of pkg.recipes) {
    // A component with no version (null) never matches a pinned version
    if (recipe.latestVersionId === null) {
      return false;
    }
    const key = `recipe:${recipe.id}`;
    const pinnedId = releasePinnedVersions.get(key);
    if (pinnedId !== recipe.latestVersionId) {
      return false;
    }
  }

  for (const standard of pkg.standards) {
    // A component with no version (null) never matches a pinned version
    if (standard.latestVersionId === null) {
      return false;
    }
    const key = `standard:${standard.id}`;
    const pinnedId = releasePinnedVersions.get(key);
    if (pinnedId !== standard.latestVersionId) {
      return false;
    }
  }

  for (const skill of pkg.skills) {
    // A component with no version (null) never matches a pinned version
    if (skill.latestVersionId === null) {
      return false;
    }
    const key = `skill:${skill.id}`;
    const pinnedId = releasePinnedVersions.get(key);
    if (pinnedId !== skill.latestVersionId) {
      return false;
    }
  }

  return true;
};

/**
 * Evaluates whether a package can be released.
 *
 * Returns one of three verdicts:
 * - `no_components`: package holds no component, regardless of release history
 * - `ready`: package can be released (has components and differs from latest)
 * - `no_change`: package is identical to its latest release
 *
 * The order is the whole point: an empty package returns `no_components` whether
 * or not it has ever been released.
 */
export const evaluatePackageReleaseGate = (
  pkg: PackageGateSnapshot,
  latestRelease: PackageReleaseDetail | null,
): 'ready' | 'no_components' | 'no_change' => {
  // Step 1: Package holds no component → no_components (regardless of release history)
  const hasComponents =
    pkg.recipes.length > 0 || pkg.standards.length > 0 || pkg.skills.length > 0;
  if (!hasComponents) {
    return 'no_components';
  }

  // Step 2: It has never been released → ready
  if (latestRelease === null) {
    return 'ready';
  }

  // Step 3: Check if anything differs from the latest release
  // Three change sources: details (name/description) and component list and versions
  const nameMatches = packageNameMatches(pkg.name, latestRelease.name);
  const descriptionMatches = packageDescriptionMatches(
    pkg.description,
    latestRelease.description,
  );
  const componentsMatch = componentListMatches(pkg, latestRelease);
  const versionsMatch = pinnedVersionsMatch(pkg, latestRelease);

  // If everything matches, no change
  if (nameMatches && descriptionMatches && componentsMatch && versionsMatch) {
    return 'no_change';
  }

  // Otherwise, there is at least one change → ready
  return 'ready';
};
