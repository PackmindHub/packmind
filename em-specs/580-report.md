x@@@# QA Review Report

**Spec**: 580.md | **Date**: 2026-06-04 | **Branch**: main | **Commit**: e764fc599
**Rules**: 4 | **Examples**: 9 | **Tech Rules**: 8 | **Events**: 3
**Domains reviewed**: API (`apps/api`), Frontend (`apps/frontend`), Packages (`packages/*`)

## Summary

| Metric                           | Count                                        |
| -------------------------------- | -------------------------------------------- |
| Covered                          | 11                                           |
| Partially Covered                | 8                                            |
| Not Covered / Diverges from spec | 1                                            |
| Code Findings                    | 10 (Critical: 0, High: 2, Medium: 5, Low: 3) |
| Standards Violations             | 2 (both Low)                                 |

**Headline assessment**: the happy path and all four error paths (R4) are implemented end-to-end and backed by a strong integration suite. The real risks are downstream of the publish click: (1) the three Amplitude analytics events are emitted but **never subscribed**, so all telemetry in spec §5 is silently lost; (2) the **publish outcome never reaches the frontend** — no-op (R3) and async failures are computed server-side but the modal always shows a generic "Publish started" toast; (3) two spec **technical-rule/spec-text divergences** (T1 "independent PR" vs the implemented single rolling PR; T2 drift-detection not implemented) need a product decision, not necessarily a code fix.

> **Reconciliation note.** The two review passes disagreed on test coverage. A unit-spec-only pass concluded several scenarios were untested. That is incorrect: a full integration suite exists at `packages/integration-tests/src/deployments/publishPackageOnMarketplace.*.spec.ts` covering **all six** scenarios the spec's engineering checklist requires (`rolling-pr`, `no-op`, `bad-format`, `invalid-token`, `name-conflict`, `concurrent`). This report's coverage matrix reflects the integration suite. The checklist's "Integration tests written" item is effectively **satisfied**.

## Functional Coverage

### Coverage Matrix

| ID    | Rule / Item                                                                                       | Layer                     | Status                        | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                      | Test Coverage                                                                                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------- | ------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-E1 | R1: Rolling PR / Publish opens "Packmind sync" PR                                                 | Cross-layer               | **Covered**                   | Job opens PR with `title: MARKETPLACE_SYNC_PR_TITLE` (`PublishPluginToMarketplaceDelayedJob.ts:378`); title = "Packmind sync" (`marketplaceSyncPullRequest.ts:9`). UC enqueues + returns `in_progress` (`PublishPackageOnMarketplaceUseCase.ts:181-215`); API `POST :marketplaceId/publish` → 202 (`marketplaces.controller.ts:357`)                                                                                          | `publishPackageOnMarketplace.rolling-pr.spec.ts`; `marketplaceSyncPullRequest.spec.ts`                                                                                           |
| R1-E2 | R1: Published plugin shown as Packmind-managed, **owner = space**                                 | Infra / Frontend          | **Partially Covered**         | "Managed by Packmind" is represented: slug keyed in `packmind-lock.json` plugins map (`applyPackmindMarketplaceLockMutation.ts:43`) + `git-subdir` source block in descriptor (`PluginDescriptorMutator.ts:52`). **Owner = space is NOT recorded**: lock entry holds `lastPublishedBy` (a _userId_), not a space; `PluginRef`/`PluginSource` carry no owner; no frontend surface labels a plugin's owning space               | concurrent spec asserts `git-subdir` source + lock slugs, but **no space-owner assertion**                                                                                       |
| R1-E3 | R1: Successive publishes append to same rolling PR (no 2nd PR)                                    | Background Job            | **Covered**                   | Always commits to fixed `MARKETPLACE_SYNC_BRANCH`; `resolveMarketplaceReadBranch` reads from `packmind/sync` when present so entries accumulate (`resolveMarketplaceReadBranch.ts:37`); `openOrUpdatePullRequest` reuses PR (`...DelayedJob.ts:378`)                                                                                                                                                                          | `rolling-pr.spec.ts`; `concurrent.spec.ts` asserts both rows share one `prUrl`                                                                                                   |
| R2-E1 | R2: Any org member (not admin) can publish                                                        | Backend Domain            | **Covered**                   | UC extends `AbstractMemberUseCase` / `executeForMembers` (`PublishPackageOnMarketplaceUseCase.ts:66`); no admin guard on the publish route                                                                                                                                                                                                                                                                                    | `concurrent.spec.ts` seeds a `role:'member'` publisher (`secondMember`) and asserts `status=success`                                                                             |
| R3-E1 | R3: No content changes → user **informed nothing committed**                                      | Background Job / Frontend | **Partially Covered**         | Backend no-op works: `NO_CHANGES_DETECTED` → `DistributionStatus.no_changes` + `wasNoop:true` event (`...DelayedJob.ts:348`). **Frontend gap**: modal returns `in_progress`, shows generic "Publish started" toast, closes — never polls the distribution, so the publisher is never told "no changes" in-flow (see HIGH-2)                                                                                                   | `no-op.spec.ts` (backend: `status=no_changes`, `wasNoop=true`). **No frontend test** that the publisher is informed of a no-op                                                   |
| R3-E2 | R3: Empty package still published (descriptor entry only)                                         | Background Job            | **Covered (impl) — test gap** | Renderer always emits a `plugin.json` manifest even with zero artefacts (`RenderPackageAsPluginUseCase.ts:102`); descriptor entry written unconditionally (`...DelayedJob.ts:298`)                                                                                                                                                                                                                                            | **No dedicated empty-package test** — all fixtures use packages with recipes                                                                                                     |
| R4-E1 | R4: Unmanaged plugin, same name → publish cancelled                                               | Backend / API / Frontend  | **Covered**                   | Preflight collision check in UC (`PublishPackageOnMarketplaceUseCase.ts:367`, throws `MarketplacePluginNameConflictError`) + re-check in job (`...DelayedJob.ts:539`); API → 409; FE maps 409 → toast (`useMarketplacePublishMutation.ts:55`)                                                                                                                                                                                 | `name-conflict.spec.ts`; UC/job/controller/FE unit specs                                                                                                                         |
| R4-E2 | R4: Descriptor missing → error + marketplace `BAD_FORMAT`                                         | Backend / Infra / API     | **Covered**                   | UC `markBadFormat` → `updateState({state:'bad_format'})` then throws (`PublishPackageOnMarketplaceUseCase.ts:282-365`); API → 400                                                                                                                                                                                                                                                                                             | `bad-format.spec.ts`; UC + controller unit specs                                                                                                                                 |
| R4-E3 | R4: Expired Git token → verbatim error message                                                    | Backend / API / Frontend  | **Covered**                   | Preflight throws `GitProviderTokenInvalidError`; API → 400 w/ message; FE `INVALID_TOKEN_MESSAGE = "…Invalid or expired Git token."` (`useMarketplacePublishMutation.ts:33`)                                                                                                                                                                                                                                                  | `invalid-token.spec.ts`; UC + controller + FE unit specs assert verbatim message                                                                                                 |
| T1    | Two simultaneous publishers each get an **independent PR**; PR opening as background job          | Background Job            | **Diverges from spec**        | Implementation uses ONE fixed `packmind/sync` branch + ONE rolling "Packmind sync" PR for all publishers, serialized by a single-concurrency queue (`marketplaceSyncPullRequest.ts:10`; `PublishPluginToMarketplaceJobFactory.ts`). Consistent with R1-E3 & Goals ("converges to the same rolling PR"), but contradicts T1's literal "independent PR". Background-job + independent **rows** + distinct authors ARE delivered | `concurrent.spec.ts` explicitly asserts `firstRow.prUrl === secondRow.prUrl` (shared PR) — i.e. tests the _opposite_ of T1's wording. Serialized (inline), not true interleaving |
| T2    | Descriptor carries `packmind-lock` (drift detection + safe concurrent merge)                      | Infra / Background Job    | **Partially Covered**         | Lock is a standalone `packmind-lock.json` (per-plugin version/contentHash/timestamps), used for managed-slug classification + convergence (each job re-reads latest lock on the rolling branch). **Drift-detection half not implemented**: the lock's `contentHash` is write-only — the no-op check reads `previous.contentHash` from the DB row, never from the lock                                                         | `packmindMarketplaceLock.spec.ts`, `applyPackmindMarketplaceLockMutation.spec.ts`; concurrent spec asserts lock holds both slugs. No drift-detection test                        |
| T3    | Publish returns control ≤~2s via async enqueue                                                    | Backend / API             | **Covered**                   | UC validates, persists row, `addJob(...)`, returns `in_progress` immediately; all Git side effects in BullMQ job; API returns 202                                                                                                                                                                                                                                                                                             | UC "enqueues the publish job" + controller `in_progress` specs                                                                                                                   |
| T4    | Git token never echoed in errors/logs                                                             | Backend / API             | **Covered**                   | Preflight logs only `error.name`/category (explicit comment `...UseCase.ts:274`); thrown errors carry no token; API logs only failure category                                                                                                                                                                                                                                                                                | Controller specs assert fixed messages carry no secret/UUID. (No test that _asserts_ a raw token never appears in logs)                                                          |
| T5    | Every publish emits structured log + **Amplitude event**; failures categorized                    | Event / Observability     | **Partially Covered**         | Structured logs + the 3 domain events emitted with categorized `failureReason`. **Amplitude not wired** — see HIGH-1                                                                                                                                                                                                                                                                                                          | Event emission tested; **no Amplitude test exists** (because no subscription exists)                                                                                             |
| T6    | New UI (button, status, error toast) WCAG 2.1 AA                                                  | Frontend                  | **Partially Covered**         | Status badge pairs icon+text (`aria-hidden` on icon), errors via `pmToaster.error` (title+description, not colour-only), semantic `PMRadioGroup`. **Unverified**: visible focus, full keyboard reachability menu→modal→submit, programmatic error association                                                                                                                                                                 | Badge render test; modal role/label tests. No focus-management / keyboard / axe assertions                                                                                       |
| T7    | `packmind-lock` forward-compatible default (absent = first publish), backfill                     | Infra / Background Job    | **Covered**                   | Missing file → `emptyPackmindMarketplaceLock()`; `schemaVersion:1` enforced on parse; upsert/backfill on each publish                                                                                                                                                                                                                                                                                                         | `packmindMarketplaceLock.spec.ts`; first-publish path in UC/job specs; `no-op`/`concurrent` specs start with `null` lock                                                         |
| T8    | Fail-fast token preflight **before** enqueue                                                      | Backend Domain            | **Covered**                   | `preflightGitToken` runs before descriptor load, collision check, row creation, and `addJob` (`PublishPackageOnMarketplaceUseCase.ts:120` precedes `:193`)                                                                                                                                                                                                                                                                    | UC: "no token → throws AND does not enqueue the job"                                                                                                                             |
| EV1   | `plugin_publish_attempted` {package_id, space_id, marketplace_slug, is_first_publish_for_package} | Event                     | **Partially Covered**         | `PluginPublishAttemptedEvent` emitted with `packageId, marketplaceId, marketplaceDistributionId, isFirstPublishForPackage`. **Missing** `space_id`; carries `marketplaceId` (UUID) not `marketplace_slug`. **Not consumed** → never sent to Amplitude                                                                                                                                                                         | Emission + `isFirstPublishForPackage` tested. No Amplitude mapping test                                                                                                          |
| EV2   | `plugin_publish_succeeded` {package_id, marketplace_slug, pr_url, was_noop, commit_count_after}   | Event                     | **Partially Covered**         | `PluginPublishedEvent` emitted with `packageId, marketplaceId, prUrl, wasNoop`. **Missing** `marketplace_slug`; `commitCountAfter` declared but **never set** by emitter. **Not consumed**                                                                                                                                                                                                                                    | `wasNoop`/`prUrl` tested (`no-op.spec.ts`). No `commitCountAfter`/Amplitude test                                                                                                 |
| EV3   | `plugin_publish_failed` {…, failure_reason ∈ 4 values}                                            | Event                     | **Partially Covered**         | `PluginPublishFailedEvent` emitted with `failureReason`; union matches the 4 categories. **Missing** `marketplace_slug`. **`invalid_token` can never fire on this event** (token caught synchronously in UC, which throws before enqueue). **Not consumed**                                                                                                                                                                   | `descriptor_missing`/`name_conflict_unmanaged`/`other` tested. No `invalid_token`-via-event test (cannot occur)                                                                  |

### Gaps

#### [R1-E2] Published plugin owner = space is not recorded

**Status**: Partially Covered
**What is missing**: "Managed by Packmind" is representable (slug in `packmind-lock.json` + `git-subdir` source), but the **owning space** is never persisted or surfaced. The lock entry records `lastPublishedBy` (a userId), not a space; `PluginRef`/`PluginSource` carry no owner; no frontend component labels a published plugin with its Packmind space.
**Where to look**: `packages/types/src/deployments/PackmindMarketplaceLock.ts:19-25`; `applyPackmindMarketplaceLockMutation.ts:36-49`; `packages/types/src/deployments/PluginRef.ts`; `PluginDescriptorMutator.ts:46-63`; frontend `PackageMarketplaceDistributions.tsx`.
**How to reproduce**: 1. Publish "AWS management" from space "Devops". 2. Inspect committed `packmind-lock.json` / `marketplace.json` and any marketplace screen — owner = "Devops" appears nowhere; only `lastPublishedBy=<userId>`. Expected per spec: screens show owner = space "Devops". _(Confirm with product whether "owner = space" is a required artefact or only a UI concept rendered elsewhere.)_

#### [R3-E1] Publisher is not informed of a no-op in the publish flow

**Status**: Partially Covered — see code finding **HIGH-2** for full detail.

#### [R3-E2] Empty-package "descriptor entry only" is untested

**Status**: Covered (impl) / test gap
**What is missing**: No test exercises a package with zero artefacts. Correctness relies on `RenderPackageAsPluginUseCase` always emitting a `plugin.json` manifest; a future change that skips the manifest for empty packages would silently break "descriptor entry only".
**Where to look**: `RenderPackageAsPluginUseCase.ts:102-126`; `PublishPluginToMarketplaceDelayedJob.ts:298-318`.
**How to reproduce**: Add a job/use-case test with an empty package; assert the commit still contains a `.claude-plugin/marketplace.json` plugin entry for the slug.

#### [T1] "Independent PR" vs implemented shared rolling PR

**Status**: Diverges from spec (decision needed)
**What is missing**: Spec §7 says concurrent publishers "must each get an independent PR", but the implementation (and its integration test) deliberately give all publishers ONE shared rolling "Packmind sync" PR — matching R1-E3 and the Goals section. This is an internal spec contradiction (§7 vs R1-E3/Goals), not obviously a code bug.
**Where to look**: `marketplaceSyncPullRequest.ts:9-10`; `PublishPluginToMarketplaceDelayedJob.ts:324-385`; `concurrent.spec.ts:318` (`firstRow.prUrl === secondRow.prUrl`).
**Resolution**: Product to reconcile §7 wording with the rolling-PR model. If rolling-PR is intended (likely), amend T1's text. The "independent PR" concurrency-safety intent is met via independent distribution rows + distinct authors + serialized single-concurrency queue.

#### [T2] `packmind-lock` drift detection not implemented — see code finding **MEDIUM-4b**.

#### [T5 / EV1–EV3] Amplitude analytics unwired & payload drift — see code findings **HIGH-1** and **MEDIUM-1**.

#### [T6] WCAG focus/keyboard/association unverified

**Status**: Partially Covered
**What is missing**: Colour-with-text pairing is satisfied, but no verification of visible focus indicators, keyboard reachability (Distribute menu → modal → radio group → submit), or programmatic association of error toasts. No axe/keyboard tests.
**Where to look**: `RunMarketplacePublish.tsx:146-254`; `DeployPackageButton.tsx:88-117`; `DistributionStatusBadge.tsx:70-88`.
**How to reproduce**: Keyboard-navigate the full publish flow; verify focus visibility and error announcement. Add an axe assertion to `RunMarketplacePublish.spec.tsx`.

## Code Review

### Findings

#### [HIGH] Three publish analytics events are emitted but never subscribed — Amplitude tracking is completely unwired

- **Category**: Technical Rule Violation
- **File**: `packages/amplitude/src/application/AmplitudeEventListener.ts:92-147`
- **Description**: `PluginPublishAttemptedEvent`, `PluginPublishedEvent`, and `PluginPublishFailedEvent` are emitted by the use case (`PublishPackageOnMarketplaceUseCase.ts:218`) and the job (`PublishPluginToMarketplaceDelayedJob.ts:404,441`) and exported from the `@packmind/types` barrel, but `AmplitudeEventListener.registerHandlers()` never `this.subscribe(...)`s to any of them, and no other listener does. Consequently `plugin_publish_attempted` / `plugin_publish_succeeded` / `plugin_publish_failed` never reach Amplitude. This nullifies spec §5 (all three events + all success metrics) and rollout phase 4 ("Telemetry wired").
- **Spec Reference**: T5; spec §5 "Amplitude events to track"; Standard: Domain Events
- **Suggested Fix**: Add the three subscriptions + handlers in `AmplitudeEventListener`, mapping payload → Amplitude metadata with the spec's snake_case property names (depends on MEDIUM-1 payload fixes).

#### [HIGH] Publish terminal state never reaches the frontend — no-op (R3) and async failures are invisible to the user

- **Category**: Bug / Missing Behavior
- **File**: `apps/frontend/src/domain/deployments/components/RunMarketplacePublish/RunMarketplacePublish.tsx:117-138`; `packages/deployments/src/application/jobs/PublishPluginToMarketplaceDelayedJob.ts` (terminal transitions)
- **Description**: Three gaps compound so the publish outcome is never shown:
  1. The modal awaits the `in_progress` response, shows a generic "Publish started" toast, and closes. It never consumes `marketplaceDistributionQueries.byId` to poll the terminal state (grep confirms `byId` has no consumer outside its own file/tests).
  2. `PublishPluginToMarketplaceDelayedJob` never calls `publishDistributionStatusChangeEvent(...)` on any terminal transition (success / `no_changes` / failure) — only the code-repository `PublishArtifactsDelayedJob.ts:147,184` emits that SSE.
  3. Even if it fired, `DistributionStatusChangeSubscription.tsx:18` invalidates `[ORGANIZATION_QUERY_SCOPE, DEPLOYMENTS_QUERY_SCOPE]`, but the distributions panel uses `useMarketplaceDistributions` keyed under `[ORGANIZATION_QUERY_SCOPE, 'marketplaces']` (`MarketplaceQueries.ts:38`) — a disjoint subtree the invalidation misses.

  Net: R3's "user is informed that no changes have been committed" is not delivered (always "Publish started"), and in-job failures (descriptor removed between preflight and job, name-conflict caught only in job, git push errors) are written to the row but never surfaced.

- **Spec Reference**: R3-E1; R4 (in-job failures); T5
- **Suggested Fix**: Either (a) poll `marketplaceDistributionQueries.byId` from the modal until terminal and toast the real outcome, or (b) emit `publishDistributionStatusChangeEvent` from the job's terminal transitions AND align the invalidated query scope with `marketplaceQueryKeys` (or invalidate both scopes).

#### [MEDIUM] Event payloads omit the spec-required analytics properties

- **Category**: Inconsistency (payload drift vs spec §5)
- **File**: `packages/types/src/deployments/events/{PluginPublishAttemptedEvent,PluginPublishedEvent,PluginPublishFailedEvent}.ts`; emitters in `PublishPluginToMarketplaceDelayedJob.ts`
- **Description**: vs spec §5: `plugin_publish_attempted` lacks `space_id` and uses `marketplaceId` not `marketplace_slug`; `plugin_publish_succeeded` lacks `marketplace_slug` and `commitCountAfter` is **never set** by either emitter; `plugin_publish_failed` lacks `marketplace_slug`. Even once the listener is wired (HIGH-1), the §5 dashboards (grouped by space / marketplace slug, commit-count ratio) cannot be built.
- **Spec Reference**: spec §5; T5
- **Suggested Fix**: Add `spaceId` + `marketplaceSlug` to the attempted payload, `marketplaceSlug` to published/failed; populate `commitCountAfter` from the rolling PR commit count (or drop it); map to snake_case in the listener transformer.

#### [MEDIUM] No-op content-hash short-circuit is dead code in the normal flow

- **Category**: Bug (performance / dead code)
- **File**: `packages/deployments/src/application/jobs/PublishPluginToMarketplaceDelayedJob.ts:169-178`
- **Description**: The hash-based no-op gate calls `findLatestByPackageAndMarketplace(...)`, which orders by `createdAt DESC` and returns the row the use case just inserted for _this_ publish (status `in_progress`). The guard `previous.id !== distribution.id` is then false, so `wasNoopByHash` is always falsy. The intended "detect unchanged package before touching Git" optimization never runs — the no-op is salvaged only by the downstream `NO_CHANGES_DETECTED` git signal, so an unnecessary render + branch-ensure + commit attempt happens on every republish. The `no-op.spec.ts` integration test passes precisely because it exercises the git-signal path (its mock throws `NO_CHANGES_DETECTED`), not the hash gate. A `findLatestSuccessfulByPackageAndMarketplace` finder already exists.
- **Spec Reference**: R3; T2 (idempotency on republish)
- **Suggested Fix**: Use `findLatestSuccessfulByPackageAndMarketplace(...)` (or filter `status === success && id !== distribution.id`) so the gate compares against the previous _successful_ publish.

#### [MEDIUM] `packmind-lock` drift detection (T2) is not implemented — the lock's contentHash is write-only

- **Category**: Technical Rule Violation
- **File**: `packages/deployments/src/application/jobs/PublishPluginToMarketplaceDelayedJob.ts:258-286`; `applyPackmindMarketplaceLockMutation.ts`
- **Description**: T2/§7 say the lock "records the canonical state Packmind expects on the next publish — used to detect drift". The lock's per-slug `contentHash`/`lastPublishedAt` are written but never read for comparison; the lock is read only to derive managed slugs for the name-collision exemption, and the no-op check reads the DB row's hash, not the lock. So the drift-detection half of T2 is absent. (The "safe concurrent merge" half is satisfied: each job re-reads the latest lock from the rolling branch and upserts only its own slug.)
- **Spec Reference**: T2; spec §7
- **Suggested Fix**: Consume the lock's per-slug `contentHash` for drift detection against the rendered hash, or document drift detection as deferred and trim the promise from T2.

#### [MEDIUM] Spec-mandated feature flag `flag.publish-packmind-package` does not exist

- **Category**: Missing Validation / Technical Rule Violation
- **File**: `apps/frontend/src/domain/deployments/components/PackageDeployments/DeployPackageButton.tsx:53-57`
- **Description**: Spec §9 + engineering checklist require a dedicated `flag.publish-packmind-package` with its own audience progression and rollback ("flag flip disables Publish in the UI"). A repo-wide search finds no such key. Publish is gated only by the broader `MARKETPLACES_FEATURE_KEY`, so it cannot be rolled back independently of the entire marketplace feature, and the documented phased rollout (telemetry → beta → GA) cannot be executed. No backend enforcement either.
- **Spec Reference**: spec §9 "Feature flag"; rollout/rollback plan
- **Suggested Fix**: Introduce the `publish-packmind-package` flag; gate the "To marketplaces" menu entry (and ideally a backend preflight) on it, layered atop `MARKETPLACES_FEATURE_KEY`.

#### [MEDIUM] `distributionSource` is never populated — `source` column is always `'app'`

- **Category**: Inconsistency (contract ↔ API)
- **File**: `apps/api/src/app/organizations/marketplaces/marketplaces.controller.ts:378-384`; `PublishPackageOnMarketplaceUseCase.ts:191`
- **Description**: The command exposes `distributionSource?: DistributionSource` and the UC persists `source: command.distributionSource ?? 'app'`, but the controller never sets `distributionSource` (it sets `source: request.clientSource`, the analytics `PackmindEventSource`, a different field). No caller sets `distributionSource`, so `MarketplaceDistribution.source` is hard-wired to `'app'` for every publish and the command parameter is dead.
- **Spec Reference**: cross-file consistency
- **Suggested Fix**: Derive `distributionSource` from `request.clientSource` in the controller, or remove the unused command field.

#### [LOW] Stale controller JSDoc claims admin enforcement (contradicts R2)

- **Category**: Inconsistency (doc vs behavior)
- **File**: `apps/api/src/app/organizations/marketplaces/marketplaces.controller.ts:130-137`
- **Description**: Class JSDoc says "Admin enforcement happens inside the use cases (they extend `AbstractAdminUseCase`)", but the publish UC extends `AbstractMemberUseCase` (correct per R2). Behavior is right; the comment could mislead a maintainer into "fixing" publish to admin-only.
- **Spec Reference**: R2
- **Suggested Fix**: Update the comment to note the controller hosts both admin- and member-scoped use cases.

#### [LOW] `PackageNotFoundError` uses `Object.setPrototypeOf` (pre-existing)

- **Category**: Standard Violation
- **File**: `packages/deployments/src/domain/errors/PackageNotFoundError.ts:5`
- **Description**: Thrown by the publish UC (`...UseCase.ts:113,117`); uses `Object.setPrototypeOf(this, …)`, which the TypeScript-good-practices standard prohibits. The six _new_ marketplace error classes in `packages/types/src/deployments/errors/` are clean — this is a pre-existing class the story leans on, so borderline-in-scope.
- **Spec Reference**: Standard: Typescript good practices
- **Suggested Fix**: Remove `Object.setPrototypeOf` (out-of-scope for this story unless requested).

#### [LOW] `IPublishPackageOnMarketplaceUseCase.ts` declares a second use case's command (contract-per-file)

- **Category**: Standard Violation
- **File**: `packages/types/src/deployments/contracts/IPublishPackageOnMarketplaceUseCase.ts`
- **Description**: The file also exports `FindMarketplaceDistributionByIdCommand`, which belongs to a different use case. The Use-Case-Architecture standard says "Define each use case contract in its own file … export exactly three type definitions".
- **Spec Reference**: Standard: Use Case Architecture Patterns
- **Suggested Fix**: Move `FindMarketplaceDistributionByIdCommand` (+ its Response/interface) to its own contract file.

#### [LOW] Bulk-selection publish silently drops all but the first package

- **Category**: Edge Case
- **File**: `RunMarketplacePublish.tsx:110,173-181`
- **Description**: `DeployPackageButton` allows multi-select, but `RunMarketplacePublish` publishes only `selectedPackages[0]` and shows a low-prominence `status="info"` alert. Consistent with the documented single-package scope (multi fan-out is a non-goal), so informational — flagged to confirm against design.
- **Spec Reference**: non-goal (multi-marketplace fan-out); Category B
- **Suggested Fix**: Confirm intended; consider disabling the marketplace entry when >1 package is selected.

## Notes on Non-Functional / Checklist Items

- **Integration tests (checklist)** — **satisfied**: all six required scenarios exist (`rolling-pr`, `no-op`, `bad-format`, `invalid-token`, `name-conflict`, `concurrent`). The `concurrent` test is serialized (inline SyncJob harness ≈ the production single-concurrency queue); it does not exercise true race interleaving where job B reads a stale lock before job A commits — acceptable given single-concurrency, but not a proof of race-safety under real overlap.
- **CHANGELOG / end-user docs (checklist)** — out of scope for this static review; verify `CHANGELOG.MD` Unreleased entry and `apps/doc/` publish-flow + error-reasons coverage before GA.

## Deferred / Inferred Items

- **Inferred (spec marks "confirm")**: the three Amplitude events (§5) and the `packmind-lock` descriptor field (§8) — assessed above; confirm property names with product. Communication plan (§9) is non-code, not assessed.
- **Out of scope (not assessed)**: marketplace linking (#541), consuming/installing the plugin, multi-marketplace fan-out, unpublishing/removal (#578). `[DEPENDENCY]` files for these were observed but not audited.

---

_Static analysis only. No code was executed during this review._
