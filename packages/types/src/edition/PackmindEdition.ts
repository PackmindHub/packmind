/**
 * Which edition a Packmind deployment runs.
 *
 * The OSS edition replaces proprietary packages with stub modules whose
 * controllers mount no routes, so calling one answers a routing 404. A status
 * code cannot say *why* a route is missing, and clients that guessed "404 on
 * this path means Community Edition" told cloud users their features did not
 * exist whenever a request legitimately 404'd. The API therefore publishes the
 * edition explicitly, in the `Packmind-Edition` response header.
 *
 * Both sides of that contract read the name and the values from here so they
 * cannot drift: the API sets the header in its bootstrap middleware, the CLI
 * reads it in its HTTP layer.
 */
export type PackmindEdition = 'cloud' | 'oss';

/**
 * Set on every API response, including ones where no controller ran.
 *
 * No `X-` prefix: RFC 6648 deprecated it for new headers.
 */
export const PACKMIND_EDITION_HEADER = 'Packmind-Edition';
