/**
 * Which edition a Packmind deployment runs. The API publishes it on every
 * response so clients stop inferring it from a route that answers 404; both
 * sides read the name and the values from here so they cannot drift.
 */
export type PackmindEdition = 'enterprise' | 'community';

// No `X-` prefix: RFC 6648 deprecated it for new headers.
export const PACKMIND_EDITION_HEADER = 'Packmind-Edition';

/**
 * Maps the `PACKMIND_EDITION` deployment input to the edition we publish. The
 * input keeps its own older vocabulary (`oss`, `proprietary`) because compose
 * files, CI and the build read it; only what we publish is renamed.
 *
 * `enterprise` is deliberately NOT an input, tempting as it now looks. What
 * decides whether a route exists is `apps/api/webpack.config.js`, which
 * compiles the Community stubs for anything that is not literally
 * `proprietary`. Answering `enterprise` here would announce routes the binary
 * was built without, and the CLI would read their 404 as a missing resource
 * rather than a missing feature.
 *
 * Lives here so the API and anything checking what a deployment runs share one
 * rule instead of a copy each.
 */
export function editionFromDeploymentValue(
  raw: string | null | undefined,
): PackmindEdition {
  return raw === 'proprietary' || raw === 'cloud' ? 'enterprise' : 'community';
}
