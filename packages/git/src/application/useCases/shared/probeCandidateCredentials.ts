import {
  GitProviderVendors,
  InvalidGitProviderCredentialsError,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { CheckAuthFailureReason } from '../../../domain/repositories/IGitProvider';
import { GitProviderCredentials } from '../../../domain/repositories/IGitProviderFactory';
import { GitProviderService } from '../../GitProviderService';

/**
 * Only these vendors can be probed. `GitProviderFactory` throws a raw
 * "Unsupported git provider source" for anything else — CLI-managed providers
 * are recorded with source 'unknown' — and an update that used to succeed must
 * not start returning a 500.
 */
const PROBEABLE_SOURCES: string[] = [
  GitProviderVendors.github,
  GitProviderVendors.gitlab,
];

export function isProbeableSource(source: string | null | undefined): boolean {
  return !!source && PROBEABLE_SOURCES.includes(source);
}

// Surfaced verbatim to the user: the API re-throws
// InvalidGitProviderCredentialsError as a 400 carrying this message, and the
// re-authentication panel renders it in place of its own fallback copy. So it
// is written as end-user guidance, not as an internal reason code.
const FAILURE_MESSAGE: Record<CheckAuthFailureReason, string> = {
  unauthorized:
    'The provider rejected this token. Check that it has not expired or been revoked, and that it belongs to this instance.',
  forbidden:
    'The provider accepted this token but refused the request. Check that it carries the required scopes.',
  rate_limited:
    'The provider is rate-limiting Packmind, so this token could not be verified. Try again in a few minutes.',
  network:
    'Packmind could not reach the provider to verify this token. Check the instance URL and try again.',
};

/**
 * Verify a candidate credential against the provider and throw unless it works.
 *
 * The re-authentication UI tells the user the token is validated against their
 * instance before it replaces the stored one, so an unverified token must never
 * be persisted — including when the probe itself could not run, since reporting
 * "validated" for a token nobody checked is the very thing being fixed.
 */
export async function assertCandidateCredentialsWork(
  gitProviderService: Pick<GitProviderService, 'checkAuthForProviderConfig'>,
  candidate: GitProviderCredentials,
  logger?: Pick<PackmindLogger, 'warn'>,
): Promise<void> {
  let result;
  try {
    result = await gitProviderService.checkAuthForProviderConfig(candidate);
  } catch (error) {
    // Anything thrown here — a real outage, but equally a misconfigured
    // candidate the resolver refuses to build — becomes the same "could not
    // reach the provider" message. Record what it actually was, so a defect on
    // our side is not indistinguishable from the provider being down.
    logger?.warn('Candidate git credentials could not be verified', {
      source: candidate.source,
      authMethod: candidate.authMethod,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new InvalidGitProviderCredentialsError(FAILURE_MESSAGE.network);
  }

  if (!result.ok) {
    throw new InvalidGitProviderCredentialsError(
      FAILURE_MESSAGE[result.reason] ?? FAILURE_MESSAGE.unauthorized,
    );
  }
}
