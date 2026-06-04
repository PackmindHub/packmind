import { UseQueryResult } from '@tanstack/react-query';
import {
  CheckProviderAuthFailureReason,
  CheckProviderAuthResponse,
} from '@packmind/types';

export type ConnectionStatusView =
  | { kind: 'no_auth' }
  | { kind: 'checking' }
  | { kind: 'connected' }
  | { kind: 'failing'; reason: CheckProviderAuthFailureReason }
  | { kind: 'unknown' };

export const PROBE_FAILURE_DESCRIPTIONS: Record<
  CheckProviderAuthFailureReason,
  string
> = {
  unauthorized:
    'Token rejected by the provider. Re-authenticate to restore access.',
  forbidden:
    'The provider denied access. Check the token scopes or the App installation.',
  rate_limited: 'Provider rate limit reached. Retry shortly.',
  network: "Couldn't reach the provider. Check your network and retry.",
};

export const NO_AUTH_DESCRIPTION =
  "Packmind can't reach this provider with the stored credentials.";

export const UNKNOWN_DESCRIPTION = "Couldn't verify the connection right now.";

type ProbeQueryShape = Pick<
  UseQueryResult<CheckProviderAuthResponse>,
  'isLoading' | 'isFetching' | 'data' | 'isError'
>;

export function deriveConnectionStatus(
  probe: ProbeQueryShape,
  { hasAuth }: { hasAuth: boolean },
): ConnectionStatusView {
  if (!hasAuth) return { kind: 'no_auth' };
  if (probe.isLoading || probe.isFetching) return { kind: 'checking' };
  if (probe.data?.ok === true) return { kind: 'connected' };
  if (probe.data?.ok === false) {
    return { kind: 'failing', reason: probe.data.reason };
  }
  return { kind: 'unknown' };
}

// The visual bucket consolidates the 4 failure reasons into 2 buckets that map
// to colors and labels. `unauthorized` is its own bucket because it's the only
// reason actionable through Re-authenticate; everything else means the
// provider is reachable on the network layer but rejected our request.
export type ConnectionStatusBucket =
  | 'connected'
  | 'checking'
  | 'token_expired'
  | 'unreachable'
  | 'unknown';

export function toStatusBucket(
  view: ConnectionStatusView,
): ConnectionStatusBucket {
  switch (view.kind) {
    case 'connected':
      return 'connected';
    case 'checking':
      return 'checking';
    case 'unknown':
      return 'unknown';
    case 'no_auth':
      return 'unreachable';
    case 'failing':
      return view.reason === 'unauthorized' ? 'token_expired' : 'unreachable';
  }
}

export function describeFailure(view: ConnectionStatusView): string | null {
  if (view.kind === 'failing') return PROBE_FAILURE_DESCRIPTIONS[view.reason];
  if (view.kind === 'no_auth') return NO_AUTH_DESCRIPTION;
  if (view.kind === 'unknown') return UNKNOWN_DESCRIPTION;
  return null;
}
