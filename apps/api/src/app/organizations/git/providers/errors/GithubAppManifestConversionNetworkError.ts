import { PackmindUpstreamError } from '@packmind/types';

/**
 * GitHub could not be reached while converting an app manifest code into app
 * credentials (network failure or timeout, no HTTP response). The message is
 * returned to the caller, so the transport detail goes to `context` only.
 *
 * The manifest code is single-use, and a dropped connection does not say
 * whether GitHub already consumed it: resubmitting the same code may never
 * succeed, so the message sends the user back to the start of the flow.
 */
export class GithubAppManifestConversionNetworkError extends PackmindUpstreamError {
  constructor(cause: unknown) {
    super(
      'upstream_unavailable',
      'github_app_manifest_conversion_network_error',
      { cause: cause instanceof Error ? cause.message : String(cause) },
      'GitHub could not be reached to finish creating the GitHub App. Start the GitHub App setup again.',
    );
    this.name = 'GithubAppManifestConversionNetworkError';
  }
}
