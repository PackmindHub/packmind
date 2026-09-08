import { PACKMIND_EDITION_HEADER, PackmindEdition } from '@packmind/types';

import { CommunityEditionError } from '../../domain/errors/CommunityEditionError';

// Keyed by the union, so a new server-side edition is a compile error here
// until this file says what the CLI does with it.
const KNOWN_EDITIONS: Record<PackmindEdition, true> = {
  enterprise: true,
  community: true,
};

// /auth/me has answered `cloud`/`oss` since long before these names, and
// reaching servers that old is the whole point of that fallback. Kept apart
// from the union above so the old vocabulary cannot leak into new code.
const LEGACY_EDITIONS: Record<string, PackmindEdition> = {
  cloud: 'enterprise',
  oss: 'community',
};

export function parsePackmindEdition(value: unknown): PackmindEdition | null {
  if (typeof value !== 'string') {
    return null;
  }

  // hasOwnProperty, not a bare lookup: `constructor` and `toString` are
  // truthy on any object literal, and a header saying either would otherwise
  // parse as an edition and silence the 404 it came with.
  if (Object.prototype.hasOwnProperty.call(KNOWN_EDITIONS, value)) {
    return value as PackmindEdition;
  }

  return Object.prototype.hasOwnProperty.call(LEGACY_EDITIONS, value)
    ? LEGACY_EDITIONS[value]
    : null;
}

/**
 * The edition the API published in the response header, or null when it
 * published nothing this CLI understands.
 */
export function readPackmindEdition(
  response: Response,
): PackmindEdition | null {
  return parsePackmindEdition(response.headers.get(PACKMIND_EDITION_HEADER));
}

/**
 * Raises `CommunityEditionError` only when the edition proves the server lacks
 * the feature: it stubs these routes out, so the route is absent and answers
 * 404. The status alone was the old bug — an enterprise 404 also means a
 * missing organization, space or resource.
 */
export function throwIfFeatureAbsent(
  response: Response,
  edition: PackmindEdition | null,
  feature: string,
): void {
  if (response.status !== 404) {
    return;
  }

  if (edition === 'community') {
    throw new CommunityEditionError(feature);
  }

  // An edition nobody stated is a server older than both the header and
  // /auth/me's edition field. Name both causes rather than pick one.
  if (edition === null) {
    throw unstatedEditionError(feature);
  }
}

const unstatedEditionError = (feature: string): Error => {
  const error: Error & { statusCode?: number } = new Error(
    `The "${feature}" feature answered 404 and this Packmind server does not state which edition it runs. The feature is not part of Packmind Community Edition; on an Enterprise deployment, check that the space and organization still exist.`,
  );
  // Stamped so PackmindHttpClient rethrows it as it is rather than wrapping it.
  error.statusCode = 404;

  return error;
};
