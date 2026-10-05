import {
  comparePackageReleaseVersions,
  parsePackageReleaseVersion,
  parsePackageVersionSpec,
} from '@packmind/types';

/**
 * Where a destination stands relative to the package it carries.
 *
 * Three states, and the two that need a hand are not the same thing:
 *
 * - `drifted` belongs to a destination tracking the live package (`*`) whose
 *   last distribution no longer matches it. A push puts it right.
 * - `behind` belongs to a destination pinned to a release that the package has
 *   moved past. What puts it right depends on whether a newer release exists,
 *   which is what `remedy` answers.
 * - `up-to-date` is everything else.
 *
 * Measuring a pinned destination the way a `*` one is measured is the bug this
 * exists to end: it reported a repository behind the moment anyone edited a
 * component, including a repository sitting on the newest release there is.
 */
export type DestinationStandingStatus = 'up-to-date' | 'drifted' | 'behind';

/**
 * What would actually close the gap.
 *
 * `release` is the case `Update` could never fix: the destination holds the
 * newest release there is, and the only thing that can move it forward is
 * cutting a new one. Offering `Update` there sends the release the repository
 * already has, the commit is a no-op, and the row reads behind afterwards —
 * which is what let a reader press that button all afternoon.
 */
export type DestinationRemedy = 'update' | 'release' | 'none';

export type DestinationStanding = {
  status: DestinationStandingStatus;
  remedy: DestinationRemedy;
};

const UP_TO_DATE: DestinationStanding = {
  status: 'up-to-date',
  remedy: 'none',
};
const DRIFTED: DestinationStanding = { status: 'drifted', remedy: 'update' };
const BEHIND_WITH_RELEASE: DestinationStanding = {
  status: 'behind',
  remedy: 'update',
};
const BEHIND_NEEDS_RELEASE: DestinationStanding = {
  status: 'behind',
  remedy: 'release',
};

export type DestinationStandingInput = {
  /** What this destination's `packmind.json` asked for. */
  versionSpec: string | null;
  /** The newest release of the package, null when it has never been cut. */
  latestReleaseVersion: string | null;
  /** Whether the package has moved on from that release. */
  hasUnreleasedChanges: boolean;
  /**
   * Components of the package that are late at this destination, as measured
   * against the live package.
   *
   * Only consulted for a destination tracking `*`. A pinned destination holds
   * exactly what its release pinned, so its components being older than the
   * live ones is the pin working, not drift.
   */
  behindArtifactCount: number;
};

/**
 * Whether a spec pins the destination to one release, and to which.
 *
 * Anything that is not an exact `X.Y.Z` reads as tracking the live package:
 * the wildcard, a distribution that recorded no spec at all, and a spec that
 * does not parse. That is the conservative reading — it keeps the destination
 * on the behaviour it already had rather than inventing a pin for it.
 */
function pinnedVersion(versionSpec: string | null): string | null {
  const parsed = parsePackageVersionSpec(versionSpec);
  return parsed?.kind === 'exact' ? parsed.version : null;
}

/** Whether `candidate` is a later release than `pin`. */
function isNewerThan(candidate: string | null, pin: string): boolean {
  if (!candidate) return false;
  const parsedCandidate = parsePackageReleaseVersion(candidate);
  const parsedPin = parsePackageReleaseVersion(pin);
  if (!parsedCandidate || !parsedPin) return false;
  return comparePackageReleaseVersions(parsedCandidate, parsedPin) > 0;
}

export function destinationStanding({
  versionSpec,
  latestReleaseVersion,
  hasUnreleasedChanges,
  behindArtifactCount,
}: DestinationStandingInput): DestinationStanding {
  const pin = pinnedVersion(versionSpec);

  // Tracking the live package: measured against it, exactly as before.
  if (pin === null) {
    return behindArtifactCount > 0 ? DRIFTED : UP_TO_DATE;
  }

  /*
   * A release newer than the pin is something `Update` can send, so it is the
   * remedy even when the package also holds unreleased changes: moving the
   * destination to the newest release is the whole of "bring this up to date"
   * for a repository that deliberately stepped off the live package.
   */
  if (isNewerThan(latestReleaseVersion, pin)) return BEHIND_WITH_RELEASE;

  // On the newest release there is, and the package has moved past it.
  if (hasUnreleasedChanges) return BEHIND_NEEDS_RELEASE;

  return UP_TO_DATE;
}

/** Whether this standing is one the reader has to do something about. */
export function needsAttention(standing: DestinationStanding): boolean {
  return standing.status !== 'up-to-date';
}
