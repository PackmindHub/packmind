import { CommandsError } from './CommandsError';

/**
 * The caller asked for one command to be placed in several packages at once.
 *
 * A component belongs to a single package, so the request cannot be satisfied
 * as written, whichever package went first.
 *
 * Raised before the command is captured rather than while placing it. The
 * placement loop used to discover this on its second package — by which point
 * the command existed — and the error was swallowed by the catch that exists to
 * keep a captured command from being lost to a failed link. The caller was told
 * the whole thing had worked. Asked here, nothing has been written yet, so
 * refusing costs the caller nothing and tells them something true.
 */
export class MultiplePackagesRequestedError extends CommandsError {
  constructor(packageSlugs: string[]) {
    super(
      'invalid_input',
      'multiple_packages_requested',
      { packageSlugs },
      `A command belongs to a single package, and ${packageSlugs.length} were given: ${packageSlugs
        .map((slug) => `"${slug}"`)
        .join(', ')}. Name the one it should ship from.`,
    );
    this.name = 'MultiplePackagesRequestedError';
  }
}
