import { PACKMIND_EDITION_HEADER, PackmindEdition } from '@packmind/types';

import { CommunityEditionError } from '../../domain/errors/CommunityEditionError';

/**
 * Keyed by the union so that adding an edition on the server is a compile
 * error here until this file decides what the CLI does with it. A bare
 * `includes` on a string array would silently treat the new one as unknown.
 */
const KNOWN_EDITIONS: Record<PackmindEdition, true> = {
  cloud: true,
  oss: true,
};

const isKnownEdition = (value: string): value is PackmindEdition =>
  Object.prototype.hasOwnProperty.call(KNOWN_EDITIONS, value);

/**
 * The edition the API published on this response, or null when it published
 * nothing the CLI understands — an older server that predates the header, a
 * proxy that stripped it, or an edition this CLI has never heard of.
 */
export function readPackmindEdition(
  response: Response,
): PackmindEdition | null {
  const raw = response.headers.get(PACKMIND_EDITION_HEADER);

  return raw !== null && isKnownEdition(raw) ? raw : null;
}

/**
 * Raises `CommunityEditionError` when a failed request proves the server does
 * not ship the feature.
 *
 * Both halves of the condition matter. The status alone is what the CLI used
 * to go on, and it is wrong on a cloud deployment, where a 404 means the
 * organization, space or resource in the path is gone — reported to the user
 * as a feature that does not exist. The header alone is wrong on a Community
 * deployment, where every failure on a route that *is* mounted (a 502 from a
 * proxy, a rate limit, a server error) would be dressed up as feature
 * absence. Together they describe only the real case: the Community Edition
 * replaces the packages behind these routes with stubs that mount nothing, so
 * the route genuinely is not there and Nest answers 404.
 *
 * Absent header means no conclusion: the caller's real error surfaces
 * untouched, which is strictly better than the old guess.
 */
export function throwIfFeatureAbsent(
  response: Response,
  feature: string,
): void {
  if (response.status === 404 && readPackmindEdition(response) === 'oss') {
    throw new CommunityEditionError(feature);
  }
}
