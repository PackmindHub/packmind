import { PACKAGE_RELEASE_VERSION_PATTERN } from './packageReleaseVersion';

/** What a `packmind.json` entry says when it tracks the live package. */
export const WILDCARD_VERSION_SPEC = '*';

/**
 * Which version of a package a repo asks for.
 *
 * Two cases, and they are the only two a `packmind.json` can hold. There is no
 * spec that floats: nothing a repo can write resolves to "whatever the newest
 * release happens to be", because a file that said so would move under the
 * repo on someone else's release — the drift this exists to stop. Asking for
 * the newest release is asking for it once, at install time, and recording the
 * concrete version that came back.
 *
 * No ranges either: `^0.1.0` and friends were parked, so anything that is
 * neither the wildcard nor an exact `X.Y.Z` triple is refused rather than
 * guessed at.
 */
export type PackageVersionSpec =
  | { kind: 'wildcard' }
  | { kind: 'exact'; version: string };

/**
 * Returns null for anything the two cases do not cover. Never throws.
 *
 * Takes `unknown` on purpose: a spec reaches the API as an unvalidated request
 * body and reaches the CLI out of a hand-edited `packmind.json`, so a
 * non-string is a malformed spec rather than a crash.
 */
export const parsePackageVersionSpec = (
  value: unknown,
): PackageVersionSpec | null => {
  if (typeof value !== 'string') {
    return null;
  }
  if (value === WILDCARD_VERSION_SPEC) {
    return { kind: 'wildcard' };
  }
  if (PACKAGE_RELEASE_VERSION_PATTERN.test(value)) {
    return { kind: 'exact', version: value };
  }
  return null;
};

export const formatPackageVersionSpec = (spec: PackageVersionSpec): string =>
  spec.kind === 'wildcard' ? WILDCARD_VERSION_SPEC : spec.version;

/**
 * Splits `@space/ops:0.1.0` into the slug and the spec written beside it.
 *
 * A ref with no `:` carries no spec, which is not the same as carrying the
 * wildcard: naming no version is how a caller asks for the newest release.
 */
export const splitPackageRef = (
  input: string,
): { slug: string; rawSpec: string | null } => {
  const separator = input.indexOf(':');
  if (separator === -1) {
    return { slug: input, rawSpec: null };
  }
  return {
    slug: input.slice(0, separator),
    rawSpec: input.slice(separator + 1),
  };
};
