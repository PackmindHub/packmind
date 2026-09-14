import {
  parsePackageReleaseVersion,
  comparePackageReleaseVersions,
  nextVersions,
} from './packageReleaseVersion';
import { PackageReleaseRefusal } from './PackageRelease';

/**
 * Whether a submitted version may be released over `currentVersion`.
 * Returns null when it may, or the refusal that applies.
 *
 * `currentVersion` is '0.0.0' for a package that has never been released.
 */
export const validatePackageReleaseVersion = (
  submitted: string,
  currentVersion: string,
): PackageReleaseRefusal | null => {
  // Check 1: submitted does not parse → 'malformed'
  const parsedSubmitted = parsePackageReleaseVersion(submitted);
  if (!parsedSubmitted) {
    return 'malformed';
  }

  // Check 2: submitted is not strictly greater than currentVersion → 'not_greater'
  const parsedCurrent = parsePackageReleaseVersion(currentVersion);
  if (!parsedCurrent) {
    throw new Error(`Not a package release version: ${currentVersion}`);
  }

  const comparison = comparePackageReleaseVersions(
    parsedSubmitted,
    parsedCurrent,
  );
  if (comparison <= 0) {
    return 'not_greater';
  }

  // Check 3: submitted is not one of nextVersions(currentVersion) → 'not_an_increment'
  const [patchIncrement, minorIncrement, majorIncrement] =
    nextVersions(currentVersion);

  if (
    submitted !== patchIncrement &&
    submitted !== minorIncrement &&
    submitted !== majorIncrement
  ) {
    return 'not_an_increment';
  }

  // All checks passed
  return null;
};
