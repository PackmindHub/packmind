# Engineer Review — #345 Upgrade Node, NX and Vite

**Issue**: #345 | **Branch**: agent/issue-345 | **Base**: `main` | **Files changed**: 13 (2 lockfile/manifest, 11 config/infra)
**Layers touched**: Tests & Infra (Docker, CI workflows, engine pins, dependency manifests)

## Verdict

`LGTM otherwise ✅, 3 point(s) below` — the upgrade is faithful to the issue and the reconciled scope (all three bumps in one PR, one commit per tool, per @cteyton). No HIGH/MEDIUM defects. The points below are non-blocking confirmations/questions.

## Findings

#### [LOW] Nx 23 migration pulled in undocumented major/minor bumps (notably `webpack-cli` 5 → 7)

- [ ] **Category**: X1 — diff behavior the issue never asked for / T4 — infra hygiene
- **File**: `package.json:112` (`webpack-cli`), `package.json:113` (`webpack-dev-server`), `package.json:110` (`webpack`), `package.json:52-53,157` (`@storybook/*` 10.4.0 → 10.5.0), `package.json:56` (`@swc/cli` 0.7.10 → 0.8.1)
- **What**: The `chore(nx)` commit (`70f426450`) rides in changes the upgrade plan never mentions: `webpack-cli` `^5.1.4` → `7.2.1` (**major**), a newly-added `webpack-dev-server: 5.2.6`, `webpack` `^5.107.2` → `5.108.4` (also caret → pinned), `@storybook/react`/`react-vite`/`addon-themes`/`storybook` 10.4.0 → 10.5.0, and `@swc/cli` 0.7.10 → 0.8.1. These are the expected side-effects of `nx migrate 23.1.0`, but a **major** `webpack-cli` bump is a real behavioral surface: `apps/api` builds with webpack (`apps/api/webpack.config.js`) and `packages/ui` runs Storybook (`packages/ui/.storybook`).
- **Why it matters**: A silent major bump inside a "chore(nx)" commit is exactly the kind of change that passes review unnoticed and breaks a build target later. The API webpack build and the UI Storybook build are the two consumers that could regress.
- **Suggested check/fix**: Confirm `nx build api` (webpack) and the Storybook build both pass under the new versions — this is what the separate build gate/CI covers, so no code change is needed if they're green; just confirm they were exercised. Optionally call out the `webpack-cli`/`webpack-dev-server`/Storybook bumps in the PR description so they aren't invisible.
- **Confidence**: needs confirmation (static review) — the bumps are certain; their runtime impact is what needs the build to confirm.

#### [LOW] `Dockerfile.api` digest cannot be verified statically

- [ ] **Category**: T4 — infra reproducibility
- **File**: `dockerfile/Dockerfile.api:1`
- **What**: The SHA256 pin was correctly preserved (not dropped) and updated to `node:24.18.0-alpine3.23@sha256:595398b0081eacda8e1c4c5b97b76cd1020e4d58a8ebcb4843b9bca1e79e7436`. Good — this is precisely the reproducibility risk the plan flagged, and it was handled. But a static reviewer can't confirm this digest is the genuine published digest for that tag.
- **Why it matters**: A wrong/typo'd digest fails the image pull outright (fail-safe, not silent), so risk is low — but it's cheap to confirm.
- **Suggested check/fix**: `docker manifest inspect node:24.18.0-alpine3.23 | jq -r '.manifests[]?.digest'` (or the Docker build smoke test) should include `sha256:595398b0…`.
- **Confidence**: needs confirmation (static review).

#### [LOW] `nx.json` was not modified by the migration — confirm the migration ran to completion

- [ ] **Category**: T4 — upgrade completeness
- **File**: (no diff line — `nx.json` is unchanged; evidence is the `.gitignore:79` addition of `.nx/migrate-runs` in `70f426450`)
- **What**: The plan noted "`nx migrate` edits `nx.json` … review the diff," but `nx.json` is absent from the diff. The other migrate side-effects (dependency bumps, the `.nx/migrate-runs` ignore entry) confirm `nx migrate` did run, and no stray `migrations.json` was left committed — so this is most likely just a version where no `nx.json` schema change was needed, not a skipped step.
- **Why it matters**: If `--run-migrations` were only partially applied, config drift could surface at build time.
- **Suggested check/fix**: Confirm `npx nx migrate --run-migrations` completed cleanly (no pending `migrations.json`) — the absence of a leftover `migrations.json` and the presence of the bumps suggest it did.
- **Confidence**: needs confirmation (static review).

## Open questions

- **Vite stayed at `^8.1.4`** (`package.json:111`), i.e. the conditional Vite-9 escalation from the reconciled scope was not triggered — this correctly implies `@nx/vite@23.1.0`/`@nx/vitest@23.1.0` accept a Vite `^8` peer range. Worth a one-line confirmation that `pnpm install` resolved with no peer-range warning for these two.
- **Stale `node:24.15.0` references remain in Michel sandbox tooling** — `scripts/michel/docker-compose.override.yml` (5×, `node:24.15.0-trixie-slim`) and `.claude/skills/michel-run-local-dev-stack/SKILL.md:12,128,131`. These are **pre-existing, unchanged files** (not in this diff) and the issue's "Drift detected" section already flagged the SKILL doc as optional/intentional. Out of scope for this PR — noted only so it isn't mistaken for a missed target. (The root `docker-compose.override.yml` is git-ignored, so it's a local sandbox artifact and irrelevant.)
- **Node engine floor** (`package.json:6`, `"node": ">=24.13.0"`) was deliberately left as a floor per the plan — 24.18.0 satisfies it. No action; confirming the plan's intent was followed.

### Scope coverage (X1) — verified present

- Node 24.18.0: `.nvmrc`, `CONTRIBUTING.md`, `apps/api/docker-package.json`, `dockerfile/Dockerfile.api` (digest refreshed), `docker-compose.yml` (5×), `docker-compose.production.yml`, `main.yml` (4 job inputs + header comment), `tmp-cli-lint-windows.yml`, `publish-cli-release.yml` — all present. Reusable workflows (`build/docker/quality/deploy`) correctly inherit `inputs.node-version`; no stale hardcoded `24.15.0` remains in any app workflow.
- Nx 23.1.0: all `@nx/*` + `nx` in root `package.json`, plus `tools/packmind-plugin/package.json`.
- Vite 8.1.4: root `package.json`.
- Commit split matches @cteyton's directive: one commit per tool (`8e81f8891` node, `70f426450` nx, `a3d374dea` vite).

---

_Static review only — no code was executed. Findings marked "needs confirmation" should be reproduced before acting. Automated checks (lint, build, e2e) are out of scope here by design._
