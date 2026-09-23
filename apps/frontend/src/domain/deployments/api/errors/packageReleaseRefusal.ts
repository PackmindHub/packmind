import {
  parsePackageReleaseVersion,
  type PackageReleaseRefusalCode,
} from '@packmind/types';
import { isPackmindError } from '../../../../services/api/errors/PackmindError';

/**
 * What the server said when it refused a cut: the code, and the version it
 * re-read at the moment of refusal.
 */
export type ServerPackageReleaseRefusal = {
  code: PackageReleaseRefusalCode;
  currentVersion: string;
};

const REFUSAL_CODES: readonly PackageReleaseRefusalCode[] = [
  'malformed',
  'not_greater',
  'not_an_increment',
  'no_components',
];

/**
 * Reads a package release refusal off a caught error, or answers null.
 *
 * The shared client keeps only what its own `ServerErrorResponse` declares
 * typed, so the two extra fields the release endpoint sends are read back
 * structurally here rather than by widening that shared shape. Anything that
 * is not a refusal - a network failure, a 403, a 500 - is not this error, and
 * the caller falls back to its generic handling.
 */
export function readPackageReleaseRefusal(
  tbd: unknown,
): ServerPackageReleaseRefusal | null {
  if (!isPackmindError(tbd)) return null;

  const data = tbd.serverError.data as {
    code?: unknown;
    currentVersion?: unknown;
  };

  /*
   * Parsed, not merely typed as a string: the drawer feeds this version to
   * `nextVersions` to rebuild its suggestions, and that throws on anything that
   * is not an X.Y.Z triple. A server that sent one would take the open form
   * down mid-render rather than show a refusal. Refusing to read it here drops
   * the caller back to its generic handling, which is a toast.
   */
  if (
    typeof data.currentVersion !== 'string' ||
    parsePackageReleaseVersion(data.currentVersion) === null
  ) {
    return null;
  }
  if (
    typeof data.code !== 'string' ||
    !REFUSAL_CODES.includes(data.code as PackageReleaseRefusalCode)
  ) {
    return null;
  }

  return {
    code: data.code as PackageReleaseRefusalCode,
    currentVersion: data.currentVersion,
  };
}
