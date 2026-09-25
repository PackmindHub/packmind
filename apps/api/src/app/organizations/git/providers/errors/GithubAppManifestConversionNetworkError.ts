import { PackmindUpstreamError } from '@packmind/types';

/**
 * GitHub could not be reached while converting an app manifest code into app
 * credentials (network failure or timeout, no HTTP response). The message is
 * returned to the caller, so the transport detail goes to `context` only.
 */
export class GithubAppManifestConversionNetworkError extends PackmindUpstreamError {
  constructor(cause: unknown) {
    super(
      'upstream_unavailable',
      'github_app_manifest_conversion_network_error',
      { cause: cause instanceof Error ? cause.message : String(cause) },
      'GitHub could not be reached to finish creating the GitHub App. Try again in a moment.',
    );
    this.name = 'GithubAppManifestConversionNetworkError';
  }
}
