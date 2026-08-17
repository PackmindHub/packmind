# Git Package

Reads and writes files in customer repositories through hosted git providers, for standards and
command deployment.

## Providers

Two vendors, one folder each under `src/infra/repositories/`, selected by
`GitProviderFactory.ts` (API operations) and `GitRepoFactory.ts` (repository operations), both
switching on `provider.source` against `GitProviderVendors` from `@packmind/types`:

- `github/` — `GithubProvider`, `GithubRepository`, plus an `auth/` subfolder
- `gitlab/` — `GitlabProvider`, `GitlabRepository`, `types.ts`, `linkHeaderUtils.ts`

## Auth is asymmetric — check which path applies

The two vendors do **not** authenticate the same way, and this is the most common source of
surprise here:

- **GitHub** delegates to `github/auth/GithubTokenResolverFactory`, which decides between a personal
  access token and a **GitHub App installation** token. The App path has its own persistence,
  `src/infra/repositories/OrganizationGitHubAppRepository.ts`, separate from the token-based
  `GitProviderRepository`.
- **GitLab** uses a raw PAT taken straight off `provider.token`, and throws if it is absent.

So "how does this repo authenticate?" has two different answers for GitHub and one for GitLab —
establish which before changing credential handling.

## Adding a provider

1. Add the vendor to `GitProviderVendors` in `@packmind/types`.
2. Create `src/infra/repositories/<vendor>/<Vendor>Provider.ts` (implementing `IGitProvider`) and
   `<Vendor>Repository.ts`, with a local `types.ts` for the vendor's API payload shapes.
3. Add the `case` to **both** `GitProviderFactory` and `GitRepoFactory` — missing the second is easy
   and only fails at runtime.

## Reuse

`packages/node-utils/src/git/` (`parseGitProviderVendor.ts`, `parseGitRepoInfo.ts`,
`extractBaseUrl.ts`) already normalises owner/repo/vendor/URL shapes across vendors. Use it instead
of parsing remote URLs again.

Shared package conventions (env tags, layout, `/test` subpath, branded IDs): [../CLAUDE.md](../CLAUDE.md)
