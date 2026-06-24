# `upgrade-plan.md` layout

Write the plan to the **repo root** as `upgrade-plan.md`. Overwrite any existing file at that path. The structure below is mandatory — downstream tooling (and the human reader's mental model) depends on it.

When a tool has no pending upgrade, still emit its section but populate it with "Up to date — no action required" so the file's shape stays stable.

```markdown
<!-- upgrade-status: available | none | partial-fetch-failure -->
# Runtime stack upgrade plan

_Generated: <YYYY-MM-DD HH:MM TZ> by the `upgrade-runtime-stack` skill._

## Summary

| Tool | Current | Latest stable | Bump | Action |
|------|---------|---------------|------|--------|
| Node.js 24.x | <X.Y.Z> | <X.Y.Z> | patch / minor / major / none | Upgrade / Skip |
| Nx | <X.Y.Z> | <X.Y.Z> | patch / minor / major / none | Upgrade / Skip |
| Vite | <X.Y.Z> | <X.Y.Z> | patch / minor / major / none | Upgrade / Skip |

<one-paragraph recommendation: e.g. "All three tools have stable updates available. Node and Nx are patch-only and safe; Vite is a minor with one deprecation worth reviewing.">

## Node.js

- **Current**: <X.Y.Z> (from `.nvmrc`)
- **Latest stable**: <X.Y.Z>, released <YYYY-MM-DD>
- **Bump type**: patch / minor / major
- **Changelog highlights**:
  - <bullet>
  - <bullet>
- **Breaking changes**: <verbatim section from changelog, or "none documented">

### Files to modify

<file map — group by category from `references/file-map.md`, with exact line patterns to change>

### Docker image pin

- New tag: `node:<new-version>-alpine<X>`
- Action: look up the sha256 digest for that tag on Docker Hub before editing `dockerfile/Dockerfile.api` and `dockerfile/Dockerfile.mcp`. Do **not** reuse the previous digest.
- Sample lookup: `docker manifest inspect node:<new-version>-alpine<X> | jq -r '.manifests[0].digest'` or use the Docker Hub UI.

## Nx

- **Current**: <X.Y.Z>
- **Latest stable**: <X.Y.Z>, released <YYYY-MM-DD>
- **Bump type**: patch / minor / major
- **Changelog highlights**:
  - <bullet>
- **Breaking changes**: <verbatim>
- **Migration command**:
  ```
  npx nx migrate <new-version>
  npm install
  npx nx migrate --run-migrations
  ```

### Files to modify

<from `references/file-map.md` — Nx section>

## Vite

- **Current**: <X.Y.Z>
- **Latest stable**: <X.Y.Z>, released <YYYY-MM-DD>
- **Bump type**: patch / minor / major
- **Changelog highlights**:
  - <bullet>
- **Breaking changes**: <verbatim>
- **Nx / Vite compatibility note**: <only if Vite is a major bump — confirm `@nx/vite` and `@nx/vitest` support the new Vite major>

### Files to modify

<from `references/file-map.md` — Vite section>

## Drift detected

<empty list, or any extra hits the Phase 5 scans found that are not in the file map>

## Validation harness

<paste the steps from `references/validation.md` verbatim>

## Risks

- <pre-flagged risk: e.g. "Node 24.X.Y removes deprecated experimental flag `--foo`; the repo does not use it (verified via rg)">
- <every breaking-change bullet from the changelogs goes here, paired with a quick repo check>

## Rollback

- Revert the upgrade commit and run `npm install` to regenerate the lockfile.
- For a Node major rollback, `downgrade_node22.sh` exists for the 22 ↔ 24 transition; on later majors a similar helper must be created before applying.
- Docker images are pinned by `@sha256:...` so previous deploys are reproducible.

## Suggested commit split

A single PR is fine for patch/minor bumps of all three tools combined. Split into separate PRs when:

- Any tool has a **major** bump.
- The Nx and Vite bumps would interact (e.g. Vite major + `@nx/vite` major).

Suggested split for this run: <one-paragraph proposal>
```
