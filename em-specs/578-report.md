# QA Review Report

**Spec**: 578.md | **Date**: 2026-06-08 | **Branch**: main | **Commit**: 4f84a6426
**Rules**: 2 | **Examples**: 3 | **Tech Rules**: 0 | **Events**: 2

## Summary

| Metric               | Count                                       |
| -------------------- | ------------------------------------------- |
| Covered              | 9                                           |
| Partially Covered    | 2                                           |
| Not Covered          | 0                                           |
| Code Findings        | 5 (Critical: 0, High: 0, Medium: 3, Low: 2) |
| Standards Violations | 2                                           |

> Target domains reviewed: API, Frontend, CLI, Packages (MCP excluded). Feature is **already implemented**. NFRs in spec §7 are marked _(inferred — confirm)_ and treated as deferred (see Deferred Items).

## Functional Coverage

### Coverage Matrix

| ID    | Rule / Item                                                                                                     | Layer                     | Status                             | Evidence                                                                                                                                                                                                                                                                                                                                                       | Test Coverage                                                                                        |
| ----- | --------------------------------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| R1-E1 | Rule 1: Removing a managed package opens a deletion PR / Ex1: remove in Packmind (`from_marketplace`) → open PR | Contract→API→UseCase→Job  | **Covered**                        | `markPluginForRemoval.usecase.ts:141-179` → `to_be_removed`, emits event `trigger='from_marketplace'`, enqueues `RemovePluginFromMarketplaceDelayedJob`. Job commits + opens rolling PR via `gitPort.openOrUpdatePullRequest` (`RemovePluginFromMarketplaceDelayedJob.ts:253`). API: `marketplaces.controller.ts:469-524`.                                     | `marketplace-plugin-removal-routes.spec.ts`; `RemovePluginFromMarketplaceDelayedJob.spec.ts:208-213` |
| R1-E2 | Rule 1 / Ex2: delete original package in Packmind (`from_packmind_package`) → mark "to be removed" + open PR    | Listener→Job              | **Covered**                        | `PackageDeletedDistributionsListener.ts:110-156` flips live distributions to `to_be_removed`, emits event `trigger='from_packmind_package'`, enqueues same removal job (shared PR path).                                                                                                                                                                       | `marketplace-plugin-removal-package-delete-cascade.spec.ts:290-334`                                  |
| R2-E1 | Rule 2: Direct repo deletion detected as drift / Ex1: scan → "Drift detected"                                   | Job→Repo→Frontend         | **Covered**                        | `MarketplaceReconciliationDelayedJob.ts:351-395`: `success` slug missing from descriptor (not pending removal) → `state='drift'` + `driftedPluginSlugs`.                                                                                                                                                                                                       | `marketplace-plugin-removal-drift.spec.ts:179-197`                                                   |
| EV1   | Event: `marketplace_plugin_removal_initiated` (marketplace_id, plugin_slug, actor_id, trigger)                  | Event→Amplitude           | **Covered**                        | `AmplitudeEventListener.ts:643-656` emits with `marketplace_id`, `plugin_slug`, `actor_id: payload.userId`, `trigger`. Event class carries all props. _(property naming flagged — see CR-3)_                                                                                                                                                                   | Trigger asserted in routes + cascade specs; no direct listener unit test for this handler            |
| EV2   | Event: `marketplace_plugin_deletion_pr_opened` (marketplace_id, plugin_slug, pr_url)                            | Event→Amplitude           | **Partially Covered**              | No event with this name exists. Closest `onPluginDeleted` → `plugin_deleted` (`AmplitudeEventListener.ts:563-573`) carries `packageId/packageSlug/marketplaceRepo` — **no `pr_url`, `marketplace_id`, `plugin_slug`**. `PluginDeletedPayload` has no `prUrl`. The PR-open moment (`RemovePluginFromMarketplaceDelayedJob.ts:253`) emits no analytics event.    | None                                                                                                 |
| C1    | Feature flag `marketplace-plugin-removal` gates remove action + drift type, default off                         | UI flag + Adapter         | **Partially Covered**              | UI key + audience `['@packmind.com','@promyze.com']` default off (`PMFeatureFlag.tsx:19-30`); gates UI (`MarketplaceDistributionsTable.tsx:148`, `PackageDetails.tsx:470`). **Flag is frontend-only** — `DeploymentsAdapter.ts:675-676` documents backend stays symmetric to link/unlink; removal use cases + drift detection run unconditionally server-side. | UI flag specs; no backend gate                                                                       |
| C2    | Deletion PR reuses existing Packmind→Git auth, no new scope                                                     | Job                       | **Covered**                        | `RemovePluginFromMarketplaceDelayedJob.ts:195,253` use same `gitPort.commitToGit` / `openOrUpdatePullRequest` as publish job. No new credential plumbing.                                                                                                                                                                                                      | `RemovePluginFromMarketplaceDelayedJob.spec.ts:208-213`                                              |
| C3    | Actor logged for audit                                                                                          | Event + API logs          | **Covered**                        | `userId` on every emission (`markPluginForRemoval.usecase.ts:155`, `PackageDeletedDistributionsListener.ts:124`); API logs masked actor `addedBy: maskIdentifier(userId)` (`marketplaces.controller.ts:484,541,598`).                                                                                                                                          | Routes/cascade specs                                                                                 |
| C4    | "to be removed" + "Drift detected" badges text + icon                                                           | Frontend                  | **Covered** _(partial — see CR-5)_ | `DistributionStatusBadge.tsx:55-61` `to_be_removed` → label + `LuClock` icon. `MarketplaceStateBadge.tsx` drift → label + tooltip (text, not colour-only).                                                                                                                                                                                                     | Component-level                                                                                      |
| C5    | Actor can cancel the retirement                                                                                 | Contract→API→UseCase + FE | **Covered**                        | `cancelPluginRemoval.usecase.ts:101-103` reverts `to_be_removed`→`success`; `DELETE .../removal` (`marketplaces.controller.ts:583-638`); `CancelRemovalButton.tsx` + `useCancelPluginRemoval`.                                                                                                                                                                 | `marketplace-plugin-removal-cancel.spec.ts:176-195`; `MarketplaceQueries.spec.ts`                    |
| C6    | De-duplicate drift events against an open deletion PR                                                           | Job                       | **Covered**                        | `MarketplaceReconciliationDelayedJob.ts:319-361`: `pendingRemovalSlugs` (`to_be_removed` rows) excluded from `driftedPluginSlugs`.                                                                                                                                                                                                                             | `marketplace-plugin-removal.spec.ts:228-230`                                                         |

### Gaps

#### [EV2] Event `marketplace_plugin_deletion_pr_opened` is not emitted

**Status**: Partially Covered
**What is missing**: Spec requires an Amplitude event `marketplace_plugin_deletion_pr_opened` (`marketplace_id`, `plugin_slug`, `pr_url`). Nothing tracks it. `onPluginDeleted` emits `plugin_deleted` (wrong name, no `pr_url`/`marketplace_id`/`plugin_slug`) and only fires on the **CLI local-delete** path, not the server PR-open. The actual PR-open emits no event.
**Where to look**: `packages/amplitude/src/application/AmplitudeEventListener.ts:563-573`; `packages/types/src/deployments/events/PluginDeletedEvent.ts` (payload lacks `prUrl`); `packages/deployments/src/application/jobs/RemovePluginFromMarketplaceDelayedJob.ts:248-264` (`ensureRollingPullRequest` discards the PR URL it receives).
**How to reproduce**:

1. Mark a plugin for removal so the removal job opens the rolling deletion PR.
2. Expected: Amplitude event `marketplace_plugin_deletion_pr_opened` with `pr_url`. Actual: no event tied to PR-open; only `plugin_deleted` exists (different name, no `pr_url`), and only on the separate CLI flow.

#### [C1] Feature flag is frontend-only; backend remove action + drift type not gated

**Status**: Partially Covered
**What is missing**: C1 says the flag gates "remove action + new drift type, default off." Only the frontend hides the button. Backend use cases (`markPluginForRemoval`, `cancelPluginRemoval`) and reconciliation drift detection run unconditionally — no server-side `marketplace-plugin-removal` check.
**Where to look**: `packages/deployments/src/application/adapter/DeploymentsAdapter.ts:675-690` (no backend gate); `apps/api/src/app/organizations/marketplaces/marketplaces.controller.ts:469-581` (endpoints have no flag guard).
**How to reproduce**:

1. As a user outside `@packmind.com`/`@promyze.com`, call `POST /organizations/:orgId/marketplaces/:marketplaceId/distributions/:distributionId/removal` directly (bypassing hidden UI).
2. Expected (strict reading of C1): rejected/no-op. Actual: removal proceeds — flag only hides the button. Likely an intentional design (backend symmetric to link/unlink) but diverges from a literal reading of C1 → **confirm with product**.

## Code Review

### Findings

#### [MEDIUM] Removal flow never captures/emits the deletion-PR-opened event or URL

- **Category**: Inconsistency / Missing Validation
- **File**: `packages/deployments/src/application/jobs/RemovePluginFromMarketplaceDelayedJob.ts:248-264` (+ `packages/types/src/deployments/jobs/RemovePluginFromMarketplaceJob.ts`, `AmplitudeEventListener.ts`)
- **Description**: The publish job (symmetric reference) captures the PR URL from `ensureRollingPullRequest`, persists it via `updateStatus({ prUrl })`, and emits `PluginPublishedEvent` with `prUrl`. The removal job's `ensureRollingPullRequest` returns `Promise<void>` (discards the URL), never persists `prUrl` on the `to_be_removed` row, and no `marketplace_plugin_deletion_pr_opened` event class or Amplitude handler exists. The deletion PR URL is permanently lost, the spec's 2nd analytics event is missing, and the documented "PR link lost → abandoned vs merged-elsewhere" risk has no mitigation.
- **Spec Reference**: Event `marketplace_plugin_deletion_pr_opened`; Risk bullet (PR link lost); Rule 1 ("can open deletion PR").
- **Suggested Fix**: Return the PR URL from `ensureRollingPullRequest` (mirror publish), persist via `updateStatus({ prUrl })`, emit a new `marketplace_plugin_deletion_pr_opened` event wired into the Amplitude listener.

---

#### [MEDIUM] Cancelling a removal does not revert the deletion already committed to the rolling `packmind/sync` PR

- **Category**: Edge Case / Bug
- **File**: `packages/deployments/src/application/useCases/cancelPluginRemoval/cancelPluginRemoval.usecase.ts:101-108`
- **Description**: `markPluginForRemoval` enqueues the removal job, which commits the descriptor entry + directory deletion onto the rolling `packmind/sync` branch (which also aggregates unrelated publishes). `CancelPluginRemovalUseCase` only flips the DB row `to_be_removed → success` — no compensating Git action. If the removal commit already landed on the still-open PR, cancelling leaves the deletion in the PR; when it later merges (bundled with other syncs) the plugin is deleted despite cancellation, and the next reconciliation flags the marketplace as drift. The cancel spec only asserts the DB revert, so the gap is untested.
- **Spec Reference**: Constraint "Actor can cancel retirement"; Rule 1 (PR symmetry).
- **Suggested Fix**: On cancel, enqueue a job to re-add the plugin entry to the rolling branch (restore descriptor/files), OR block cancellation once the deletion commit has landed, OR guard cancel to only-before-job-runs and document it.

---

#### [MEDIUM] Amplitude event uses snake_case property names — violates lowerCamelCase standard

- **Category**: Standards Violation
- **File**: `packages/amplitude/src/application/AmplitudeEventListener.ts:643-656`
- **Description**: `onMarketplacePluginRemovalInitiated` emits properties `marketplace_id`, `plugin_slug`, `actor_id` (snake_case), copied verbatim from the spec wire-names. Every other handler uses lowerCamelCase (`marketplaceId`, `packageSlug`, …). The event _name_ is correctly snake_cased and verb-ending; only the property keys are wrong.
- **Spec Reference**: Standard "Amplitude analytics usage" (property name should be lower camelCase).
- **Suggested Fix**: Rename to `marketplaceId`, `pluginSlug`, `actorId`.

---

#### [LOW] `actor_id` sent as an event property duplicates the Amplitude distinct id (raw user identifier)

- **Category**: Standards Violation (minor)
- **File**: `packages/amplitude/src/application/AmplitudeEventListener.ts:652`
- **Description**: `actor_id: payload.userId` forwards the raw user UUID as a property, but `userId` is already the Amplitude distinct id (`EventTrackingAdapter.ts:18-22`), so it is redundant. The standard says "no user-related data tracked"; shipping a user identifier as a property is the kind of user-related data the standard discourages, and no other handler does this.
- **Spec Reference**: Standard "Amplitude analytics usage" (no user-related data tracked); Constraint (actor masked per compliance if email).
- **Suggested Fix**: Drop the `actor_id` property (distinct id already carries the actor), or confirm audit attribution in Amplitude is genuinely required.

---

#### [LOW] "Drift" marketplace-state badge renders text only (no icon)

- **Category**: Inconsistency with Constraint
- **File**: `apps/frontend/src/domain/marketplaces/components/MarketplaceStateBadge.tsx:88-97`
- **Description**: Constraint requires drift badge "text + icon". `DistributionStatusBadge` correctly renders icon + label for `to_be_removed`, but `MarketplaceStateBadge` renders only `presentation.label` with no `PMIcon` for any state (the `StatePresentation` type has no `icon` field). Accessibility/consistency miss against the explicit text+icon constraint for the drift badge.
- **Spec Reference**: Constraint "Drift detected badge text + icon".
- **Suggested Fix**: Add `icon: IconType` to `StatePresentation` and render it alongside the label, matching `DistributionStatusBadge`.

### Areas checked and found clean

- **State-transition atomicity**: `markPluginForRemoval` flips status first, then enqueues inside try/catch that logs (not rethrows) on enqueue failure — intentional (reconciliation/CLI fallback). `success → to_be_removed` guard enforced via `PluginDistributionInvalidStateError`. No half-state.
- **Drift dedupe (C6)**: Correct. `pendingRemovalSlugs` excluded from `driftedPluginSlugs`; reconciliation reads default branch so an unmerged deletion PR does not falsely trigger drift.
- **Concurrency**: Double-removal rejected by `success`-only guard → 409 ConflictException (`marketplaces.controller.ts:730`); removal queue single-concurrency.
- **Guards**: Both controllers use `@UseGuards(OrganizationAccessGuard)`; mark/cancel enforce admin (`AbstractAdminUseCase`); `reconcile` is member-scoped by design.
- **CLI track-deleted rollback**: Local FS mutation first, then best-effort `trackDeletion` (swallows API failure with warning) — by design, local delete is source of truth.
- **TS error standard**: No `Object.setPrototypeOf` in `PluginDistributionInvalidStateError` / `PluginDistributionNotFoundError`.
- **`@packmind/editions` import ban**: No matches in touched files.
- **PII masking**: Controllers mask `userId` via `maskIdentifier` (first 6 + `*`). `syncMarketplaceNow.usecase.ts:57,69,81` logs `actorId` unmasked but it is a UUID (not email/phone/IP) — outside compliance scope; noted only.

## Deferred Items

- **NFR Performance** (§7) — drift scan completes within minutes for ~hundreds of plugins; _(inferred — confirm)_. Not assessed.
- **NFR Accessibility** (§7) — keyboard reachability / focus state on new "remove" action; _(inferred — confirm)_. Not assessed (badge text+icon partially assessed — see CR-5).
- **NFR Observability** (§7) — structured logs `removal_initiated`, `pr_opened`, `marked_for_removal`, `drift_detected` with full field set; _(inferred — confirm)_. Only `marked_for_removal`-equivalent (`markPluginForRemoval.usecase.ts:191`) and drift/removed info logs present; no `pr_opened` marker. Noted, not failed.
- **Success metric events naming** (§5) — Amplitude events listed as _(inferred — confirm)_. EV1/EV2 assessed against the names as written.

---

_Static analysis only. No code was executed during this review._
