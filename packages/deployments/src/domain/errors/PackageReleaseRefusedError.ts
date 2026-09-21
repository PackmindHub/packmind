import { PackageReleaseRefusalCode } from '@packmind/types';

/**
 * A cut the server refused.
 *
 * The `super()` message is developer-facing: the sentence the user reads is
 * built by the API layer from `code` and `currentVersion`, never here.
 */
export class PackageReleaseRefusedError extends Error {
  constructor(
    readonly code: PackageReleaseRefusalCode,
    readonly currentVersion: string,
  ) {
    super(`Package release refused: ${code}`);
    this.name = 'PackageReleaseRefusedError';
  }
}
