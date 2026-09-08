import { Configuration } from '@packmind/node-utils';
import { PackmindEdition } from '@packmind/types';

// Lives in @packmind/types because the CLI reads the same values off the
// Packmind-Edition header; re-exported so importers here keep one import site.
export type { PackmindEdition };

// PACKMIND_EDITION is a deployment input with its own older vocabulary
// (`proprietary`, `oss`), baked into compose files and CI; only what we
// publish is renamed, so the names we answer to here are not the ones we
// answer with.
//
// Deliberately NOT accepting `enterprise`. What decides whether a route
// exists is `apps/api/webpack.config.js`, which compiles the stubs for
// anything that is not literally `proprietary` — and it reads process.env at
// build time, so it never sees a value only Infisical holds. Announcing an
// edition this rule does not recognise would claim routes the binary was
// built without, and the CLI would then read their 404 as a missing resource
// rather than a missing feature. Match that rule; anything else is community,
// which is the reading that degrades safely.
export async function resolvePackmindEdition(): Promise<PackmindEdition> {
  const raw = await Configuration.getConfig('PACKMIND_EDITION');
  return raw === 'proprietary' || raw === 'cloud' ? 'enterprise' : 'community';
}

// Hosting mode for the GitHub App integration. Distinct from edition: the
// proprietary edition can run either Packmind-hosted (shared App via
// GITHUB_APP_SLUG/GITHUB_APP_ID/GITHUB_APP_PRIVATE_KEY) or on-prem (each org
// registers its own App via the manifest flow, same as OSS).
export type GithubAppMode = 'shared' | 'on-prem';

export async function resolveGithubAppMode(): Promise<GithubAppMode> {
  const slug = await Configuration.getConfig('GITHUB_APP_SLUG');
  return slug ? 'shared' : 'on-prem';
}
