import { InvalidPackageReleaseVersionError } from './InvalidPackageReleaseVersionError';

export type PackageReleaseVersion = {
  major: number;
  minor: number;
  patch: number;
};

// The regex of D-009, verbatim.
export const PACKAGE_RELEASE_VERSION_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

// Returns null for anything the pattern refuses. Never throws.
// Takes `unknown` on purpose: the version reaches the API as an unvalidated
// request body, so a non-string is a malformed version, not a crash.
export const parsePackageReleaseVersion = (
  value: unknown,
): PackageReleaseVersion | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const match = value.match(PACKAGE_RELEASE_VERSION_PATTERN);
  if (!match) {
    return null;
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
};

export const formatPackageReleaseVersion = (
  version: PackageReleaseVersion,
): string => {
  return `${version.major}.${version.minor}.${version.patch}`;
};

// Negative, zero or positive, the Array.prototype.sort convention.
// Compares the triple numerically — major, then minor, then patch.
export const comparePackageReleaseVersions = (
  a: PackageReleaseVersion,
  b: PackageReleaseVersion,
): number => {
  if (a.major !== b.major) {
    return a.major - b.major;
  }
  if (a.minor !== b.minor) {
    return a.minor - b.minor;
  }
  return a.patch - b.patch;
};

// Returns exactly three strings, in the order patch, minor, major.
export const nextVersions = (current: string): [string, string, string] => {
  const parsed = parsePackageReleaseVersion(current);
  if (!parsed) {
    throw new InvalidPackageReleaseVersionError(current);
  }

  const patch = formatPackageReleaseVersion({
    major: parsed.major,
    minor: parsed.minor,
    patch: parsed.patch + 1,
  });

  const minor = formatPackageReleaseVersion({
    major: parsed.major,
    minor: parsed.minor + 1,
    patch: 0,
  });

  const major = formatPackageReleaseVersion({
    major: parsed.major + 1,
    minor: 0,
    patch: 0,
  });

  return [patch, minor, major];
};
