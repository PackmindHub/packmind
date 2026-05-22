---
name: 'release-proprietary'
description: 'Orchestrate a full Packmind proprietary release: verify Main CI/CD Pipeline is green on both OSS and proprietary main, drive the release on the OSS sibling repo (version bumps, CHANGELOG, tag, push), wait for the oss-sync workflow to land the release commit on the proprietary fork, then tag and push `release/{{version}}` on the proprietary repo. Invoke from the proprietary repo.'
---

Create a full Packmind proprietary release with version `{{version}}`.

This skill orchestrates a cross-repository release that spans the OSS fork (`/home/mcouaran/Code3/packmind3`) and the proprietary repo (current working directory, `/home/mcouaran/Code3/packmind-proprietary3`). All real release content lives on OSS; the proprietary side simply receives the OSS commit through the `oss-sync` workflow and gets the same `release/{{version}}` tag.

Hardcoded paths (will be parameterized in a later iteration):

* OSS repo: `/home/mcouaran/Code3/packmind3` (remote `PackmindHub/packmind`)
* Proprietary repo: `/home/mcouaran/Code3/packmind-proprietary3` (remote `PackmindHub/packmind-proprietary`)

Scripts live next to this file under `./scripts/`. From the proprietary repo root, paths are `.claude/skills/release-proprietary/scripts/<name>`.

## Phase 0 — Pre-flight (proprietary repo)

### 0.1 Feature flags audit gate (MANDATORY)

Before doing anything, stop and ask the user:

> Has the `feature-flags-audit` skill been run on the **proprietary** repo for this release? (yes / no)

If the answer is anything other than an explicit `yes`, abort and tell the user to run `feature-flags-audit` on the proprietary repo first.

If the audit surfaced any loose / stale flags that should have been removed, instruct the user to:

1. Check whether each loose flag also exists in the OSS repo (`/home/mcouaran/Code3/packmind3`). Most code flows from OSS → proprietary via `oss-sync`, so flags should generally be cleaned up on the OSS side.
2. Remove them in OSS first, let the oss-sync workflow land the cleanup on proprietary, then re-invoke this skill.

### 0.2 No open `oss-sync` PR

```bash
./.claude/skills/release-proprietary/scripts/check-oss-sync-pr.sh PackmindHub/packmind-proprietary
```

When the auto-sync hits a merge conflict it opens a PR on branch `oss-sync` instead of fast-forwarding. If such a PR is open, Phase 2 polling cannot succeed. Abort and ask the user to resolve and merge the PR first.

### 0.3 CI green on both repos

Run the check script for both repositories:

```bash
./.claude/skills/release-proprietary/scripts/check-ci.sh PackmindHub/packmind
./.claude/skills/release-proprietary/scripts/check-ci.sh PackmindHub/packmind-proprietary
```

Exit codes:

* `0` — green, proceed.
* `1` — the run failed (or no run found, or auth missing). Abort, surface the URL.
* `2` — the run is still in progress / queued. Not a failure: ask the user whether to wait and retry, or abort.

### 0.4 Clean working tree on proprietary and no local divergence

```bash
git -C /home/mcouaran/Code3/packmind-proprietary3 status --porcelain   # must be empty
git -C /home/mcouaran/Code3/packmind-proprietary3 fetch origin main
git -C /home/mcouaran/Code3/packmind-proprietary3 merge-base --is-ancestor HEAD origin/main \
  || (echo "local main has diverged from origin/main — reconcile before releasing" && exit 1)
```

If the working tree is dirty, or local `HEAD` is not an ancestor of `origin/main`, abort and ask the user to reconcile.

## Phase 1 — Drive the OSS release (`/home/mcouaran/Code3/packmind3`)

All commands in this phase target the OSS repo via `git -C` or `cd`.

### 1.1 Verify clean OSS state and update

```bash
git -C /home/mcouaran/Code3/packmind3 status --porcelain   # must be empty
git -C /home/mcouaran/Code3/packmind3 checkout main
git -C /home/mcouaran/Code3/packmind3 pull --ff-only origin main
```

If the working tree is dirty or the pull is not fast-forward, abort and ask the user to reconcile.

### 1.2 Bump versions

```bash
node ./.claude/skills/release-proprietary/scripts/bump-versions.mjs {{version}} /home/mcouaran/Code3/packmind3
( cd /home/mcouaran/Code3/packmind3 && npm install )
```

`npm install` regenerates `package-lock.json` with the new version.

### 1.3 Rewrite CHANGELOG for release

Resolve today's date in ISO 8601 (`YYYY-MM-DD`) — call it `{{today}}`.

```bash
node ./.claude/skills/release-proprietary/scripts/changelog-release.mjs {{version}} {{today}} /home/mcouaran/Code3/packmind3
```

### 1.4 Commit the release and push main

```bash
./.claude/skills/release-proprietary/scripts/commit-release.sh /home/mcouaran/Code3/packmind3 {{version}}
```

This stages `package.json`, `apps/api/docker-package.json`, `package-lock.json`, and `CHANGELOG.MD`, commits with the exact subject `chore: release {{version}}` (Phase 2 polls for this fixed string), and pushes main. The script never uses `--no-verify`.

### 1.5 Tag the release and push the tag

```bash
./.claude/skills/release-proprietary/scripts/tag-release.sh /home/mcouaran/Code3/packmind3 {{version}}
```

Creates `release/{{version}}` at HEAD (the release commit just pushed) and pushes the tag. If the tag already exists, the script verifies it points at HEAD before re-pushing.

### 1.6 Prepare next dev cycle on OSS

```bash
node ./.claude/skills/release-proprietary/scripts/changelog-next.mjs {{version}} /home/mcouaran/Code3/packmind3
./.claude/skills/release-proprietary/scripts/commit-next-cycle.sh /home/mcouaran/Code3/packmind3
```

## Phase 2 — Wait for oss-sync to land on proprietary

The `sync-from-oss-repository.yml` workflow on the proprietary repo merges OSS commits into proprietary `main` automatically (usually under a minute). It will land BOTH the release commit AND the subsequent "prepare next development cycle" commit in the same sync, so the release commit will typically NOT be at `HEAD` by the time we detect it — we must capture its SHA explicitly.

```bash
RELEASE_SHA=$(./.claude/skills/release-proprietary/scripts/wait-for-oss-sync.sh \
  /home/mcouaran/Code3/packmind-proprietary3 {{version}})
```

The script writes the SHA to stdout (captured into `RELEASE_SHA`) and progress to stderr. It polls `origin/main` every 5 seconds for a commit whose subject is exactly `chore: release {{version}}`, with a 10-minute timeout. Each iteration scans the last 500 commits on `origin/main` (covers any realistic backlog).

If it times out, abort and instruct the user to:

* Check the `sync-from-oss-repository` workflow on `PackmindHub/packmind-proprietary`.
* Check whether an open `oss-sync` PR appeared after Phase 0 ran.

Once `RELEASE_SHA` is set, fast-forward the local proprietary checkout (purely to keep the working tree in sync — we do NOT rely on HEAD for the tag):

```bash
git -C /home/mcouaran/Code3/packmind-proprietary3 checkout main
git -C /home/mcouaran/Code3/packmind-proprietary3 pull --ff-only origin main
```

## Phase 3 — Tag proprietary

### 3.1 Re-check proprietary CI green

The sync just pushed new commits to proprietary main; the Phase 0 CI gate is now stale. Re-run it (allowing exit 2 = still running) and either wait or abort:

```bash
./.claude/skills/release-proprietary/scripts/check-ci.sh PackmindHub/packmind-proprietary
```

### 3.2 Tag the proprietary release commit

```bash
./.claude/skills/release-proprietary/scripts/tag-release.sh \
  /home/mcouaran/Code3/packmind-proprietary3 {{version}} "${RELEASE_SHA}"
```

Passing the SHA explicitly is essential — tagging `HEAD` would tag the next-cycle commit. The script also re-verifies that the target commit's subject is exactly `chore: release {{version}}` and refuses to tag otherwise; it will not allow retagging an existing tag at a different commit.

### 3.3 Done

Report to the user:

* OSS release commit URL: `https://github.com/PackmindHub/packmind/releases/tag/release/{{version}}` (or the compare link)
* Proprietary tag URL: `https://github.com/PackmindHub/packmind-proprietary/releases/tag/release/{{version}}`
* Reminder: any deployment workflow that watches `release/*` tags will trigger.

## Important notes

* Do NOT use `--no-verify` on any commit. If a hook fails, fix the root cause and create a new commit.
* The release commit subject MUST be exactly `chore: release {{version}}` — Phase 2 matches subjects by exact equality and `tag-release.sh` verifies subject equality before tagging. Any prefix/suffix (e.g. gitmoji) will break the flow.
* Date format MUST be ISO 8601 (`YYYY-MM-DD`).
* Verify each commit and push succeeded before proceeding to the next step.
* If anything fails mid-way after the OSS tag is pushed, do NOT delete the OSS tag — coordinate a follow-up patch release instead.

## Recovery cheatsheet

If the flow fails at a known phase, recover as follows:

* **After 1.4, before 1.5** (release commit pushed, no OSS tag yet): re-run `tag-release.sh <oss-dir> {{version}}` from Phase 1.5. The script tags HEAD only if HEAD's subject is `chore: release {{version}}`.
* **After 1.5, before 1.6** (OSS is tagged, no next-cycle commit): re-run `changelog-next.mjs` + `commit-next-cycle.sh`. Then proceed to Phase 2.
* **After 1.6, Phase 2 timed out**: investigate the sync workflow / oss-sync PR. Once unstuck, re-run only Phase 2 + Phase 3.
* **After Phase 3 failure** (OSS tagged, proprietary not tagged): once any blocker is cleared, re-run only Phase 3, passing the same `RELEASE_SHA` (recover it via `git log origin/main --format='%H %s' -500 | grep "chore: release {{version}}"`).
