---
name: 'product-map'
description: 'Produces a functional cartography of the Packmind application (domains × features × usage signals) as `product-map.md` at the project root. Manual-only skill — invoke ONLY when the user explicitly runs `/product-map` or asks to "map the application", "cartographier l''application", "list every feature", or "find decommission candidates". Do NOT auto-load on generic mentions of features, domains, spaces, or standards.'
---

# Product Map

Build a point-in-time functional map of the Packmind application by scanning the backend (use cases + endpoints), the frontend (routes + pages), and the CLI (commands). Aggregate features by functional domain, compute a usage signal per feature, and write a single Markdown report at `product-map.md` (project root). The report supports decommission decisions: features with weak signals (no frontend entry, no recent activity, no tests) become candidates for removal.

**Manual-only.** Run only when the user explicitly invokes `/product-map` or asks for a functional cartography. The description above intentionally avoids generic trigger keywords.

**This skill only maps — it does not delete anything.** Decommission decisions stay with the user.

## Phase 0: Confirm Scope

Before scanning, confirm with the user:

- **Target output path** — default `product-map.md` at project root; offer to override.
- **Scope override** — default scans `apps/api`, `apps/frontend`, `apps/cli`, and `packages/*`. Ask if any package should be excluded (e.g., infra-only packages like `migrations`, `logger`, `node-utils`).
- **Decommission tolerance** — confirm signal heuristics (see Phase 4); user may want stricter or looser flagging.

If the user invoked the skill with explicit instructions, skip confirmation and proceed with stated parameters.

## Phase 1: Seed Domain Taxonomy

Before launching subagents, read `packages/` and `apps/` to discover the domain taxonomy. Use folder names as the seed list — do NOT invent domains.

The seed domains in this codebase (verify by `ls packages/` at run time, this list may drift):

- **Spaces** — `packages/spaces`, `packages/spaces-management`
- **Standards** — `packages/standards`, `packages/linter`, `packages/linter-ast`, `packages/linter-execution`
- **Skills** — `packages/skills`
- **Recipes / Playbooks** — `packages/recipes`
- **Change Proposals** — `packages/playbook-change-applier`, `packages/playbook-change-management`
- **Users / Auth / Organizations** — `packages/accounts`
- **AI Agents / Coding Agent** — `packages/coding-agent`
- **Git Integration** — `packages/git`
- **Analytics** — `packages/amplitude`
- **Support / Crisp** — `packages/crisp`
- **Deployments** — `packages/deployments`
- **LLM Infrastructure** — `packages/llm`
- **Legacy Import** — `packages/import-practices-legacy`

Cross-cutting infra packages (`logger`, `node-utils`, `migrations`, `types`, `ui`, `frontend`, `editions`, `test-utils`, `integration-tests`, `plugins`) are NOT user-facing domains — exclude from the map unless they expose user-facing features (e.g., `editions` may expose subscription/edition selection).

Pass this seed taxonomy to all subagents so they classify consistently.

## Phase 2: Launch 3 Parallel Source Subagents

Launch three `Agent(general-purpose)` subagents simultaneously. Each scans one source and returns a structured feature list classified by domain.

| Subagent | Source | Scans |
|----------|--------|-------|
| 1. Backend | Use cases + API endpoints | `packages/*/src/application/useCases/**/*.ts`, NestJS controllers in `apps/api/src/**/*.controller.ts` |
| 2. Frontend | Routes + pages | `apps/frontend/src` router config + page components |
| 3. CLI | Commander commands | `apps/cli/src` command definitions |

### Subagent Prompt Template

Each subagent receives:
1. The seed domain taxonomy from Phase 1
2. The source-specific instructions below
3. A request for structured output

```
You are mapping the Packmind application. Your scope: <SOURCE_NAME>.

# Domain taxonomy (use these labels — do not invent new domains unless you find a clear standalone area):
<seed taxonomy>

# Your task
Scan <PATHS> and produce a list of every user-facing feature exposed through this source.
Group features under their domain. A "feature" is a user-meaningful capability (e.g.
"create a space", "invite a member", "archive a standard"), not a technical implementation
detail (e.g. "TypeORM repository method").

For each feature, return:
- domain: <one of the seed labels, or "Other (justify)">
- feature: short imperative phrase (≤ 8 words)
- evidence: file path(s) + relevant export/route/command name
- visibility: "user-facing" or "admin-only" or "internal"

Skip:
- Pure infra plumbing (logging, config loading, health checks)
- Cross-cutting middleware (auth guards, rate limiters) — list them once under "Auth"
- Test utilities

# Output format
Markdown list grouped by domain. One bullet per feature. End with a 2-line summary
(total features, anything unclassifiable).
```

### Source-Specific Instructions

**Backend subagent**: scan use cases first (they map 1:1 to features), then controllers to confirm the endpoint exists. A use case with no controller binding is an "orphan" — flag it as `visibility: internal`.

**Frontend subagent**: scan the router config first to enumerate routes, then read each route's page component to determine what the user actually does there. A route that only renders a placeholder or 404 is a candidate for decommission — flag it.

**CLI subagent**: enumerate every Commander `.command(...)` registration. Subcommands count as separate features (e.g. `playbook add` and `playbook submit` are two features under "Change Proposals").

### Sequential Fallback

If the Agent tool is unavailable, perform the three scans sequentially in the current session using `Grep` + `Read`. Maintain the same output structure.

## Phase 3: Merge Sources Per Feature

After subagents return, merge their lists into a single feature table. Two source entries belong to the same feature when:
- Same domain, AND
- Feature phrases describe the same capability (e.g. "create a space" backend ↔ "Create Space" frontend route ↔ `space create` CLI command)

For each unified feature row, record which sources cover it:

| Domain | Feature | Backend | Frontend | CLI | Evidence |
|--------|---------|:-:|:-:|:-:|----------|
| Spaces | Create a space | ✓ | ✓ | ✓ | `packages/spaces/src/.../createSpace.ts`, `/spaces/new`, `space create` |

If a feature exists in only one source, that is a signal — keep the row, leave the missing sources blank.

## Phase 4: Compute Usage Signal

For each feature row, compute additional signal columns. These power the decommission section.

| Signal | How to compute |
|--------|----------------|
| **Tests** | Grep for the use case class or controller path in `**/*.spec.ts` and `**/*.test.ts`. Mark ✓ if at least one test references it. |
| **Amplitude** | Grep for the feature's domain prefix in `packages/amplitude/src/application/AmplitudeEventListener.ts`. Mark ✓ if any event for this domain is subscribed AND the event name plausibly matches the feature. |
| **Recent activity** | `git log --since="6 months ago" --pretty=format:%H -- <evidence path>`. Mark ✓ if at least one commit. |

A feature is a **decommission candidate** when ANY of the following holds:
- No frontend coverage AND no CLI coverage (= backend-only, possibly orphaned)
- No tests AND no recent activity (= cold code)
- Frontend route exists but backend use case missing (= dead UI)
- Backend use case exists but no entry point in any client (= dead endpoint)

Do NOT auto-delete — only flag.

## Phase 5: Write Report

Write `product-map.md` at the project root with this structure:

```markdown
# Packmind Product Map — <YYYY-MM-DD>

> Snapshot of every user-facing feature, grouped by functional domain.
> Generated by the `product-map` skill. Manual invocation only.

## Scope

- Sources scanned: backend use cases & endpoints, frontend routes & pages, CLI commands
- Packages excluded: <list>
- Git revision: <short SHA>

## Functional Map

| Domain | Feature | Backend | Frontend | CLI | Tests | Amplitude | Recent | Notes |
|--------|---------|:-:|:-:|:-:|:-:|:-:|:-:|-------|
| Spaces | Create a space | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| Spaces | Archive a space | ✓ | – | – | – | – | – | backend-only orphan |
| ...

## Decommission Candidates

Features matching at least one decommission heuristic (see methodology). Sorted by
weakest signal first.

| Feature | Reason | Evidence |
|---------|--------|----------|
| Archive a space | backend-only, no tests, no commits in 6 months | `packages/spaces/src/.../archiveSpace.ts` |
| ...

## Methodology

- A feature = a user-meaningful capability, not a technical implementation detail.
- Sources merged when same domain + same capability across backend/frontend/CLI.
- Signal heuristics: see SKILL.md Phase 4.
- This is a point-in-time snapshot — re-run to refresh.
```

End by printing to the user:
- Path of the generated report
- Total features mapped
- Total decommission candidates
- Top 3 domains by feature count

## Operating Rules

- **Never delete code based on the report.** Decommission decisions belong to the user.
- **Do not invent domains.** If a feature does not fit the seed taxonomy, place it under "Other" with a one-line justification — the user will refine the taxonomy on re-run.
- **Stay factual.** Every row must cite an evidence path. No inferred features.
- **Re-runnable.** The skill produces a fresh snapshot each run; overwrite the previous report after confirming with the user.