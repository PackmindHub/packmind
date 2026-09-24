import {
  GitProviderVendors,
  InvalidGitProviderCredentialsError,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { CheckAuthFailureReason } from '../../../domain/repositories/IGitProvider';
import { GitProviderCredentials } from '../../../domain/repositories/IGitProviderFactory';
import { GitProviderService } from '../../GitProviderService';

/**
 * Only these vendors can be probed: `GitProviderFactory` throws a raw
 * "Unsupported git provider source" for anything else, and CLI-managed
 * providers are recorded with source 'unknown', so probing them would turn an
 * ordinary update into a 500.
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
  token_unreadable:
    'Packmind could not read the stored token. Enter a new token to restore access.',
};

/**
 * Throws unless the candidate credential actually works. A probe that could not
 * run fails too: the re-authentication UI promises the token was validated, so
 * reporting "validated" for a token nobody checked is exactly what must not
 * happen.
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
    // Everything thrown here collapses into one "could not reach the provider"
    // message, a real outage and a candidate the resolver refuses to build
    // alike. Log the cause so a defect on our side stays distinguishable from
    // the provider being down.
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
