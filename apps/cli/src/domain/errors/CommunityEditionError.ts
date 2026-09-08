/**
 * Error thrown when an endpoint is not available in the Community Edition.
 * Caught per command rather than centrally, because what to do about a missing
 * feature differs: `lint` has nothing to lint and exits 0, `playbook submit`
 * has changes it could not submit and exits 1.
 */
export class CommunityEditionError extends Error {
  public readonly isCommunityEditionError = true;

  constructor(feature: string) {
    super(
      `The "${feature}" feature is not available in Packmind Community Edition.`,
    );
    this.name = 'CommunityEditionError';
  }
}

export function isCommunityEditionError(
  tbd: unknown,
): tbd is CommunityEditionError {
  // `throw null` is legal, and reading a property off it here would replace
  // the caller's error with a TypeError from its own catch block.
  return (
    typeof tbd === 'object' &&
    tbd !== null &&
    (tbd as CommunityEditionError).isCommunityEditionError === true
  );
}
