import { PACKMIND_EDITION_HEADER, PackmindEdition } from '@packmind/types';

import { CommunityEditionError } from '../../domain/errors/CommunityEditionError';

// Keyed by the union, so a new server-side edition is a compile error here
// until this file says what the CLI does with it.
const KNOWN_EDITIONS: Record<PackmindEdition, true> = {
  cloud: true,
  oss: true,
};

const isKnownEdition = (value: string): value is PackmindEdition =>
  Object.prototype.hasOwnProperty.call(KNOWN_EDITIONS, value);

/**
 * The edition the API published, or null when it published nothing this CLI
 * understands — an older server, a proxy that stripped the header, or an
 * edition it has never heard of.
 */
export function readPackmindEdition(
  response: Response,
): PackmindEdition | null {
  const raw = response.headers.get(PACKMIND_EDITION_HEADER);

  return raw !== null && isKnownEdition(raw) ? raw : null;
}

/**
 * Raises `CommunityEditionError` only when the server proves it lacks the
 * feature: it stubs these routes out, so the route is absent and answers 404.
 * The status alone was the old bug — a cloud 404 also means a missing
 * organization, space or resource. The header alone would call a Community
 * server's 502 or rate limit a missing feature. No header, no conclusion:
 * the real error surfaces.
 */
export function throwIfFeatureAbsent(
  response: Response,
  feature: string,
): void {
  if (response.status === 404 && readPackmindEdition(response) === 'oss') {
    throw new CommunityEditionError(feature);
  }
}
