/**
 * Which edition a Packmind deployment runs. The API publishes it on every
 * response so clients stop inferring it from a route that answers 404; both
 * sides read the name and the values from here so they cannot drift.
 */
export type PackmindEdition = 'enterprise' | 'community';

// No `X-` prefix: RFC 6648 deprecated it for new headers.
export const PACKMIND_EDITION_HEADER = 'Packmind-Edition';
