import { GitInternalError } from './GitInternalError';

/**
 * The `default:` arm of the switch both factories run over `provider.source`.
 * The value comes off a persisted row, not off a request, so a vendor we
 * cannot build a client for is our own broken invariant — a row written by a
 * version that knew the vendor, or a vendor added to the enum without a case
 * here — rather than the caller's mistake.
 *
 * Distinct from `UnsupportedGitProviderError` in `@packmind/types`, which is
 * about a remote URL we failed to recognise.
 */
export class UnsupportedGitProviderSourceError extends GitInternalError {
  constructor(source: string) {
    super(
      'unsupported_git_provider_source',
      { source },
      `Unsupported git provider source: ${source}`,
    );
    this.name = 'UnsupportedGitProviderSourceError';
  }
}
