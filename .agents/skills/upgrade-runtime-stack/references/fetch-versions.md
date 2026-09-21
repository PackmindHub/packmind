# Fetching latest stable versions

Per-source parsing rules. All sources are fetched with `WebFetch`. Always strip pre-release tags (`rc`, `beta`, `alpha`, `canary`, `next`, `preview`, `dev`, `pre`).

## Node.js (24.x line only)

- URL: `https://raw.githubusercontent.com/nodejs/node/refs/heads/main/doc/changelogs/CHANGELOG_V24.md`
- The file is the changelog for the entire Node 24 line. Section headers look like:
  ```
  <a id="24.15.0"></a>
  ## 2025-XX-YY, Version 24.15.0 (Current), @<release-manager>
  ```
- Parse the topmost `## YYYY-MM-DD, Version 24.X.Y` heading whose tag is **not** marked `(Pre-release)`, `(RC)`, etc.
- Output:
  - `latest`: e.g. `24.17.0`
  - `released`: e.g. `2025-09-12`
  - `highlights`: bullet headings between this version's heading and the next version heading. Limit to ~10 short bullets. Skip commit-only bullets.
- The "Current" / "LTS" annotation may be present — record it but do not gate the recommendation on it; the 24.x line moves from Current to LTS during its life.

## Nx

- URL: `https://nx.dev/changelog`
- The page lists release entries newest-first. Each entry looks like a section with a version (e.g. `Nx 22.7.2`) and a date.
- Parse the topmost entry whose version is **not** suffixed with `-rc.N`, `-beta.N`, `-alpha.N`, `-canary.N`, `-next.N`.
- Output:
  - `latest`: e.g. `22.7.2`
  - `released`: e.g. `2025-09-30`
  - `highlights`: bullet section titles from that entry (e.g. "Breaking changes", "Features", "Bug Fixes"). Capture any text explicitly under "Breaking changes" verbatim — it drives the risk section.
- If the major changes between current and latest, also fetch the matching `https://nx.dev/changelog#vNN-migration` anchor or the linked migration guide and include the URL in the plan.

## Vite

- URL: `https://raw.githubusercontent.com/vitejs/vite/refs/heads/main/packages/vite/CHANGELOG.md`
- Standard `keep-a-changelog` style. Headings look like:
  ```
  ## 8.0.3 (YYYY-MM-DD)
  ```
- Parse the topmost `## X.Y.Z` heading without a pre-release tag.
- Output:
  - `latest`: e.g. `8.1.0`
  - `released`: e.g. `2025-10-04`
  - `highlights`: subsection titles (`### Features`, `### Bug Fixes`, `### BREAKING CHANGES`). Capture any `BREAKING CHANGES` section verbatim.

## Fallback when a source cannot be fetched

If `WebFetch` returns an error or an empty body, do not block the run. In the plan, record:

```
- <tool>: unable to fetch <URL> — skipped this run.
```

The two remaining tools are still processed normally.
