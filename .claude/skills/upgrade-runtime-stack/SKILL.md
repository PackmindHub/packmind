---
name: 'upgrade-runtime-stack'
description: 'Check whether newer stable versions of Node.js (24.x line), Nx, or Vite are available and, if so, generate a detailed upgrade plan markdown file at the repo root. Use this skill whenever the user asks to "check for runtime upgrades", "upgrade Node/NX/Vite", "is our Node version current", "plan a Node 24 upgrade", "refresh our runtime stack", "monthly stack check", or anything along those lines — even if they don''t name a specific tool. Also use it when the user wants a recurring/cadence check of build-toolchain currency. Output is a plan only — does NOT mutate package.json, Dockerfiles, lockfiles, or any other repo file. CI/CD wrappers can invoke this skill to keep the runtime stack fresh.'
---

# Upgrade Runtime Stack

Goal: detect available stable upgrades of **Node.js (24.x line only)**, **Nx**, and **Vite**, then emit an actionable, ready-to-execute upgrade plan as a markdown file at the repo root. Stop at the plan — never edit application files.

## Why this skill exists

Manual runtime upgrades drift months between attempts and produce avoidable risk. This skill captures the canonical file map (mined from the prior Node 22 → 24 migration on `emdash/migration-node24-cc0s9`) so each upgrade run reuses the same checklist instead of rediscovering it. The plan is the deliverable. A human or a CI bot decides whether to act on it.

## Execution mode

This skill **must run fully non-interactive**. It is invoked from CI/CD in headless mode where no human can answer prompts.

- Never call `AskUserQuestion` or any other clarification tool.
- Never ask the user to confirm a choice. The skill makes deterministic decisions from the inputs (baked URLs + repo state) and produces the plan.
- Never wait on long-running interactive commands. Read-only file inspection, `WebFetch`, and `rg` scans are the only actions needed.
- All output goes to a single deterministic artifact: `upgrade-plan.md` at the repo root. The terminal print at the end (Phase 7) is informational only — CI can ignore stdout.

If any input is missing or ambiguous, the skill records the gap **inside the plan** (e.g. "Vite changelog unreachable this run") and continues. It never blocks on input.

## Inputs

The skill takes **no arguments**. Version sources are baked in:

| Tool | Source URL | What to extract |
|------|------------|-----------------|
| Node.js 24.x | `https://raw.githubusercontent.com/nodejs/node/refs/heads/main/doc/changelogs/CHANGELOG_V24.md` | Latest stable 24.x release |
| Nx | `https://nx.dev/changelog` | Latest stable Nx major.minor.patch |
| Vite | `https://raw.githubusercontent.com/vitejs/vite/refs/heads/main/packages/vite/CHANGELOG.md` | Latest stable Vite release |

See `references/fetch-versions.md` for the exact parsing rules per source.

## Workflow

Execute phases in order. Each phase has a single clear deliverable. Do not skip steps; the value of this skill comes from the consistency of the output.

### Phase 1 — Read current versions from the repo

Read these exact locations and record what is currently pinned:

- `.nvmrc` → exact Node version (e.g. `24.15.0`)
- `package.json` (root) → `engines.node`, `engines.npm`, `devDependencies.nx`, `devDependencies["@nx/*"]`, `devDependencies.vite`
- `apps/api/docker-package.json` → `engines.node`, `engines.npm`
- `dockerfile/Dockerfile.api` and `dockerfile/Dockerfile.mcp` → `FROM node:<version>-alpine<alpine-version>@sha256:<digest>`
- `docker-compose.yml` and `docker-compose.production.yml` → every `image: node:<version>-alpine<alpine-version>` occurrence
- `.github/workflows/*.yml` → default `node-version` inputs

Record in a single in-memory table; this becomes the "Current versions" section of the plan.

### Phase 2 — Fetch latest stable versions

Use `WebFetch` against each source URL listed in **Inputs**. Follow the per-source parsing rules in `references/fetch-versions.md`.

Filtering rules (apply to every source):

- **Skip** anything tagged `next`, `beta`, `alpha`, `rc`, `canary`, `preview`, `dev`, or `pre`.
- **Node.js**: only consider `v24.x.y` entries. Ignore 22.x, 26.x, etc. — even if newer.
- **Nx**: take the highest `X.Y.Z` published as a stable release.
- **Vite**: take the highest `X.Y.Z` published as a stable release.

For each tool, also extract the **published date** if visible and a short summary of headline changes / breaking changes from the changelog body covering the range *(current version, latest]*. This summary feeds the risk section of the plan.

### Phase 3 — Compute delta and decide

For each tool, compare current vs. latest stable:

- `latest == current` → no upgrade needed for that tool. Record as "up to date".
- `latest > current` → upgrade candidate. Classify the bump as `patch`, `minor`, or `major` using semver rules. Note any breaking-change headlines from Phase 2.
- `latest < current` → unusual. Record but do not recommend a downgrade.

If **all three** tools are up to date, still produce `upgrade-plan.md` but with a single "No upgrades available" section plus the timestamp. This keeps the CI integration deterministic.

### Phase 4 — Resolve Docker image dependencies

When Node is being upgraded, the Docker image pin (`node:<version>-alpine<X>@sha256:<digest>`) must change in lockstep. The plan must include:

1. The exact new tag string to use (`node:<new-version>-alpine<X>`).
2. The current Alpine major (read from existing Dockerfiles) — keep it unless a Node breaking change requires a different base.
3. An explicit instruction line: *"Look up the sha256 digest for `node:<new-version>-alpine<X>` on Docker Hub before pinning."* Do not fabricate a digest.

If Node is not being upgraded, the Docker section of the plan only lists which files **would** change in a future Node bump, for reference.

### Phase 5 — Map files to modify

Use `references/file-map.md` as the authoritative list of files that any Node / Nx / Vite upgrade must touch in this repo. The map is grouped per tool. Include in the plan only the file groups whose tool has a pending upgrade.

After listing the bake-in files, run a quick scan to surface drift — files that match the relevant version pattern but are not yet in the map:

- Node version drift: `rg -n "node:[0-9]+\.[0-9]+\.[0-9]+|node-version: ['\"]?[0-9]+" --hidden -g '!node_modules' -g '!dist'`
- Nx version drift: `rg -n '"nx": "[0-9]+\.[0-9]+\.[0-9]+"|"@nx/[a-z-]+": "[0-9]+\.[0-9]+\.[0-9]+"' --hidden -g '!node_modules' -g '!dist'`
- Vite version drift: `rg -n '"vite": "(\^|~)?[0-9]+\.[0-9]+\.[0-9]+"' --hidden -g '!node_modules' -g '!dist'`

Add any hits that are not already covered to a "Drift detected" subsection of the plan so a human can decide whether to extend the file map.

### Phase 6 — Validation harness

Copy the validation steps from `references/validation.md` into the plan. The harness is the contract for "this upgrade did not break the repo" and must be runnable end-to-end after applying the plan.

### Phase 7 — Write `upgrade-plan.md`

Use the exact structure defined in `references/plan-template.md`. Write to the repo root as `upgrade-plan.md`. Overwrite any existing file at that path — the plan is always the latest snapshot.

The first line of the plan **must** be a machine-readable status comment so CI can branch on it without parsing the body:

```
<!-- upgrade-status: available | none | partial-fetch-failure -->
```

- `available` — at least one tool has a stable upgrade.
- `none` — all three tools up to date.
- `partial-fetch-failure` — one or more source URLs could not be fetched this run.

After writing, print to stdout (informational only — CI may discard):

- One-line summary per tool (e.g. `Node 24.15.0 → 24.17.0 (patch)`).
- The absolute path of the generated `upgrade-plan.md`.
- Whether any drift was detected (so the file map may need updating).

Do **not** apply edits. Stop here.

## Hard rules

- Never edit `package.json`, `package-lock.json`, `.nvmrc`, Dockerfiles, docker-compose files, CI workflows, or any other source file. The skill produces a plan only.
- Never invent version numbers, dates, or sha256 digests. If a source URL cannot be fetched, mark the tool as "unknown — fetch failed" in the plan and continue with the other tools.
- Never recommend Node majors other than 24. The team is on the 24.x line and a major bump is a separate, deliberate project.
- Never include `rc`, `beta`, `alpha`, `canary`, `next`, `preview`, `dev`, or `pre` versions in the recommendation, even if newer than current.

## Reference files

- `references/fetch-versions.md` — per-source parsing rules for the three changelog URLs.
- `references/file-map.md` — canonical list of files an upgrade of each tool touches in this repo.
- `references/plan-template.md` — exact markdown layout of `upgrade-plan.md`.
- `references/validation.md` — lint / test / build commands that act as the safety harness.