/**
 * GitHub App hosting mode used by the GitHub integration.
 *
 * Distinct from Packmind's edition (oss vs proprietary): the proprietary
 * edition can run either Packmind-hosted (a single shared GitHub App, with
 * credentials in env vars) or on-prem (each organization registers its own
 * GitHub App via the manifest flow, same as OSS).
 *
 * The mode is inferred from the presence of `GITHUB_APP_SLUG`:
 *   - set     → 'shared'  (read env-configured GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY)
 *   - not set → 'on-prem' (read the OrganizationGitHubApp record bound to the GitProvider)
 */
export type GithubAppMode = 'on-prem' | 'shared';
