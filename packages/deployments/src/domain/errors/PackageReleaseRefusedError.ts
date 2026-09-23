import { DeploymentsError, PackageReleaseRefusalCode } from '@packmind/types';

/**
 * A cut the server refused: the request is well-formed, and the current state
 * of the package rules it out — so `conflict`, answering 409.
 *
 * The `super()` message stays developer-facing: the sentence the user reads is
 * built by the frontend from `code` and `currentVersion`. Those two are the
 * reason `packages.controller.ts` still maps this error by hand instead of
 * leaving it to `DomainExceptionFilter` — the filter's body is
 * `{ statusCode, message, reason }` and carries no `context`, so a plain
 * filter answer would drop both fields the frontend needs. The `kind` is here
 * anyway, so that any path which does not go through that controller answers
 * 409 rather than 500.
 */
export class PackageReleaseRefusedError extends DeploymentsError {
  constructor(
    readonly code: PackageReleaseRefusalCode,
    readonly currentVersion: string,
  ) {
    super(
      'conflict',
      'package_release_refused',
      { version: currentVersion },
      `Package release refused: ${code}`,
    );
    this.name = 'PackageReleaseRefusedError';
  }
}
