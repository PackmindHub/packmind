# QA Review Report

**Spec**: 598.md | **Date**: 2026-06-08 | **Branch**: main | **Commit**: e45faf0a7
**Rules**: 1 | **Examples**: 5 | **Tech Rules**: 5 | **Events**: 0

> **User Story**: As an org admin, I want to see the health and last-push date of each connection, so I can spot expired tokens or stale connections before they break a publish. (Parent epic #582)
> **Domains reviewed**: Frontend (apps/frontend), API (apps/api), Packages (packages/\*). CLI / MCP out of scope.

## Summary

| Metric               | Count                                        |
| -------------------- | -------------------------------------------- |
| Covered              | 2                                            |
| Partially Covered    | 4                                            |
| Not Covered          | 4                                            |
| Code Findings        | 10 (Critical: 0, High: 1, Medium: 7, Low: 2) |
| Standards Violations | 4 (+1 pre-existing, noted)                   |

**Headline**: The current implementation resolves connection health by firing a **live, synchronous vendor API call per row on every page render** — the exact architecture the spec forbids (T1). There is no stored health state, no background job, no SSE emitter, and no state-transition log. The status set is not closed (`Checking…` / `Status unknown` leak to the UI), and badges differentiate by colour-dot with no per-status icon. Plus a HIGH authorization gap: an "org admin" feature is reachable by any org member.

> **Scope note (T2)**: Marketplace publishes are **intentionally excluded** from the connection last-push date (product decision, 2026-06-08). The "Last distribution" column tracks package distributions (standards/recipes) only; marketplace recency is surfaced separately via the marketplace count. The spec's R1-E1/T2 wording ("any artifact … marketplace publish") is therefore outdated and should be amended.

## Functional Coverage

### Coverage Matrix

| ID    | Rule / Item                                                                                                    | Layer                | Status                | Evidence                                                                                                                                                                                                                                                                                                                 | Test Coverage                                                                                                                         |
| ----- | -------------------------------------------------------------------------------------------------------------- | -------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| R1-E1 | Healthy connection marked Connected (label + icon); last-push date; `—`/`Never used` placeholder               | Frontend             | **Partially Covered** | "Connected" label `ConnectionStatusPill.tsx:16,49-51`; last-push via `LastDistributionCell` `ConnectionsTable.tsx:219-237` (relative time + "Never used" `:222-228`). BUT pill uses colour dot only (`:41-48,67`) — **no icon**.                                                                                         | E2E covers only token-expired; no test for Connected row, "Never used", or a real date.                                               |
| R1-E2 | Expired/invalid token → "Token expired" + warning icon; row-level reconnect/rotate                             | Frontend             | **Partially Covered** | `unauthorized → token_expired` `connectionStatus.ts:73`; label `ConnectionStatusPill.tsx:18`. Reconnect/Revoke only in drawer `ConnectionDrawer.tsx:671-718`. BUT **no warning icon**, and **no row-level** action (row has refresh + edit/delete menu only `ConnectionsTable.tsx:194-209`).                             | `ConnectionStatusProbe.spec.ts:62-98` asserts "Token expired" text (row + drawer). No reconnect-affordance test.                      |
| R1-E3 | Vendor non-auth error → "Unreachable" + error icon; tooltip exposes sanitised error class                      | Frontend             | **Partially Covered** | `forbidden/rate_limited/network → unreachable` `connectionStatus.ts:73`; label `:19`. Sanitised text `PROBE_FAILURE_DESCRIPTIONS:14-24` rendered **only in drawer block variant**, NOT inline row (`ConnectionStatusPill.tsx:38-54`). BUT **no error icon**; **no row tooltip**.                                         | No test for unreachable/network/rate_limited on the row.                                                                              |
| R1-E4 | Closed status set: exactly `Connected`/`Token expired`/`Unreachable`; no "unknown"/"never checked" in UI       | Frontend             | **Not Covered**       | `toStatusBucket` returns **5 buckets** incl. `checking`/`unknown` `connectionStatus.ts:53-58`; both render visible labels "Checking…" / "Status unknown" `ConnectionStatusPill.tsx:17,20`. Status computed client-side per row; backend does NOT pre-resolve.                                                            | None.                                                                                                                                 |
| R1-E5 | On-demand refresh per row + ping on page load                                                                  | Frontend             | **Partially Covered** | `RefreshStatusButton → probe.refetch()` `ConnectionsTable.tsx:195-199,244-287`; each row mounts `useCheckProviderAuthQuery(enabled:hasAuth)` `:109-111` (pings on load, but via per-row live probes, not a single list ping). Route has no clientLoader.                                                                 | E2E relies on on-mount probe; no explicit Refresh-button-click test.                                                                  |
| T1    | Read stored state; NO sync vendor call on load; background job + SSE                                           | Backend/API/Frontend | **Not Covered**       | Opposite implemented: live probe per row. `GitProviderQueries.ts:23-47` (`staleTime:0`) → `GET :id/check-auth` → `git-providers.service.ts:572-582` → `GitProviderService.ts:90-103` → `GithubProvider.checkAuth():151-174` (hits api.github.com). No connection-health SSE type in `SSEEvent.ts`; no BullMQ health job. | Use case unit-tested — but tests the synchronous architecture T1 forbids.                                                             |
| T2    | Last push aggregates standards + recipes into one timestamp (marketplace excluded by product decision)         | Backend (Infra)      | **Covered**           | `findLastSuccessfulDistributionDateByProviderIds` `DistributionRepository.ts:1761-1824` aggregates `distribution` success rows per provider (target→gitRepo, MAX createdAt). Marketplace publishes intentionally out of scope (see Scope note).                                                                          | Repo test mocks `getRawMany`; `GetLastDistributionDateByProvidersUseCase` has NO test; service merge untested (see test-gap finding). |
| T3    | Structured log on each state transition (`org_id`,`connection_id`,`from_status`,`to_status`, sanitised reason) | Backend              | **Not Covered**       | No transition logging (0 hits for from_status/to_status). `GitProviderService.checkProviderAuth` no logging; `GithubProvider:167-172` per-probe warn only, lacks ids/from/to. No stored prior status to diff.                                                                                                            | None.                                                                                                                                 |
| T4    | "Unreachable" tooltip must not leak token/vendor body; sanitised error class only                              | Frontend/Backend     | **Covered**           | Closed enum contract `{ok:true}                                                                                                                                                                                                                                                                                          | {ok:false; reason∈unauthorized                                                                                                        | forbidden | rate_limited | network}`; `GithubProvider`maps HTTP status only, no body forwarded; frontend maps reason → fixed canned strings`connectionStatus.ts:14-24`. No leak. | No dedicated leak test, but typed contract structurally prevents it. |
| T5    | Every status/badge uses text + icon — never colour alone (WCAG 2.1 AA)                                         | Frontend             | **Not Covered**       | `BUCKET_VISUAL` = label + colour dot only (`green/orange/red.500`) `ConnectionStatusPill.tsx:15-21`; dot is `aria-hidden`, **no per-status icon** `:41-48,67`.                                                                                                                                                           | None.                                                                                                                                 |

### Gaps

#### [R1-E1] Healthy connection — no icon

**Status**: Partially Covered
**What is missing**: Per-status icon glyph on the row pill (spec wants label + icon). Note: the coloured dot + text label already satisfies WCAG 1.4.1 (non-colour signal present); the gap is the absent per-status icon, not a colour-only violation.
**Where to look**: `apps/frontend/src/domain/git/components/shared/ConnectionStatusPill.tsx:15-52` (`BUCKET_VISUAL` has label + dot color, no icon).
**How to reproduce**: 1. Open a healthy connection row. 2. Observe colour dot + "Connected" text — no status icon.

#### [R1-E2] Token expired — no warning icon, no row-level reconnect

**Status**: Partially Covered
**What is missing**: Warning icon on the pill; reconnect/rotate action directly on the row.
**Where to look**: `ConnectionStatusPill.tsx:18`; `ConnectionsTable.tsx:194-209` (row actions); reconnect lives in `ConnectionDrawer.tsx:671-718`.
**How to reproduce**: 1. Revoke a PAT (check-auth → unauthorized). 2. Row shows "Token expired" + dot. Expected: warning icon + inline Reconnect/Rotate without opening drawer.

#### [R1-E3] Unreachable — no error icon, no row tooltip exposing error class

**Status**: Partially Covered
**What is missing**: Error icon; row tooltip/details exposing the sanitised error class (description renders only in drawer block variant).
**Where to look**: `ConnectionStatusPill.tsx:38-54` (inline variant renders neither description nor tooltip); `describeFailure` used only `:72-76` in block variant.
**How to reproduce**: 1. Make check-auth return network/rate_limited. 2. Row shows "Unreachable" + dot, no tooltip.

#### [R1-E4] Status set not closed — "Checking…" and "Status unknown" leak to UI

**Status**: Not Covered
**What is missing**: Backend pre-resolution to exactly three statuses; suppression of `checking`/`unknown` in the rendered pill.
**Where to look**: `connectionStatus.ts:53-58` (5-bucket type), `:41-46` (`deriveConnectionStatus` emits checking/unknown), `ConnectionStatusPill.tsx:17,20`.
**How to reproduce**: 1. Load the page. 2. In-flight probe → "Checking…"; absent/errored data → "Status unknown". Expected: only Connected/Token expired/Unreachable ever appear.

#### [R1-E5] Refresh — no explicit-click test; load pings via per-row live probes

**Status**: Partially Covered
**What is missing**: A single list-level ping (currently N per-row live probes); explicit Refresh-button-click test.
**Where to look**: `ConnectionsTable.tsx:109-111,195-199,244-287`.
**How to reproduce**: 1. Open list with N connections. 2. N synchronous check-auth requests fire on load.

#### [T1] Synchronous vendor call on page load; no background job/SSE

**Status**: Not Covered
**What is missing**: Read-from-stored-state on load; background job + SSE emitter; elimination of the on-load live probe.
**Where to look**: `GitProviderQueries.ts:23-47` → `git-providers.controller.ts` check-auth → `git-providers.service.ts:572-582` → `GitProviderService.ts:90-103` → `GithubProvider.ts:151-174`. No `CONNECTION_HEALTH*` in `packages/types/src/sse/SSEEvent.ts`; no BullMQ health job.
**How to reproduce**: 1. Open the page with N connections. 2. Network tab shows N synchronous `GET …/check-auth`, each a live GitHub/GitLab request on load. Expected: load reads cached/stored health; background job refreshes + pushes via SSE.

#### [T3] No state-transition structured log

**Status**: Not Covered
**What is missing**: Structured log on each health transition with the five required fields.
**Where to look**: `GitProviderService.ts:90-103` (no logging); `GithubProvider.ts:167-172` (per-probe warn, lacks transition + ids). No stored prior status to diff.
**How to reproduce**: 1. Cause Connected→Token expired. 2. No transition log emitted.

#### [T5] Status badge uses colour dot, no icon

**Status**: Not Covered
**What is missing**: Per-status icon alongside text (WCAG: never colour alone).
**Where to look**: `ConnectionStatusPill.tsx:15-21,41-48,67`.
**How to reproduce**: 1. View any pill. 2. Only non-text visual is a colour dot.

## Code Review

### Findings

#### [HIGH] Authorization gap: "org admin" feature accessible to any org member

- **Category**: Bug (security gap) / Missing Validation
- **File**: `apps/api/src/app/organizations/git/providers/git-providers.controller.ts:47-49`; `apps/api/src/app/organizations/guards/organization-access.guard.ts:29-87`; `packages/git/src/application/useCases/checkProviderAuth/checkProviderAuth.usecase.ts:13-14`; `packages/git/src/application/useCases/listProviders/listProviders.usecase.ts:14-15`; `packages/deployments/src/application/useCases/GetLastDistributionDateByProvidersUseCase.ts:13-14`
- **Description**: The story is scoped to "Org admin". The controller is guarded only by `OrganizationAccessGuard` (member-level; no role/admin check), and all three backing use cases extend `AbstractMemberUseCase`, not `AbstractAdminUseCase`. Any org member — not just admins — can list connections, see health, and trigger live vendor auth probes. Token health/reconnect is an admin concern; this is an under-enforced authorization boundary.
- **Spec Reference**: User Story ("Org admin sees…"); Standard: Use Case Architecture Patterns
- **Suggested Fix**: If admin-only, switch use cases to `AbstractAdminUseCase`/`executeForAdmins` and/or add an admin role guard. If member access is intended, update the spec to make the discrepancy explicit.

---

#### [MEDIUM] Health resolved by synchronous live vendor call on list render — no stored state / job / SSE (T1)

- **Category**: Technical Rule Violation
- **File**: `apps/frontend/src/domain/git/components/list/ConnectionsTable.tsx:109-111`; `apps/frontend/src/domain/git/api/queries/GitProviderQueries.ts:23-47`; `packages/git/src/infra/repositories/github/GithubProvider.ts:151-174`
- **Description**: Each row calls `useCheckProviderAuthQuery(id,{enabled:hasAuth})` with `staleTime:0,gcTime:0`; backend `checkAuth()` performs a real `GET /user` (or `/installation/repositories`) against the vendor on every probe. T1 forbids a synchronous vendor call on page load and requires stored state resolved by a background job + SSE. No health job, no SSE event, no persisted health column. With N connections, load fires N synchronous server requests, each a live vendor call (rate-limit/performance risk).
- **Spec Reference**: Technical Rule T1 (and T3)
- **Suggested Fix**: Resolve health in a background job; persist `status` + `reason` + `lastCheckedAt`; serve from `listProviders`; push updates via the existing `sse.service.ts`.

---

#### [MEDIUM] No state-transition logging (T3)

- **Category**: Technical Rule Violation
- **File**: `packages/git/src/infra/repositories/github/GithubProvider.ts:167-172`; `packages/git/src/infra/repositories/gitlab/GitlabProvider.ts:195-199`; `packages/git/src/application/useCases/checkProviderAuth/checkProviderAuth.usecase.ts`
- **Description**: T3 requires a structured log on each health transition with `org_id`, `connection_id`, `from_status`, `to_status`, sanitised reason. Providers only `logger.warn` on a failing probe (current state, no from/to, no connection_id). Because health is never stored, transitions can't be detected. Operators can't observe expired→connected or connected→unreachable.
- **Spec Reference**: Technical Rule T3
- **Suggested Fix**: When the background resolver writes a new status, diff against stored previous status and emit a structured transition log when they differ.

---

#### [MEDIUM] Status pill differentiates by colour only — no per-status icon (T5 / E1–E3)

- **Category**: Technical Rule Violation
- **File**: `apps/frontend/src/domain/git/components/shared/ConnectionStatusPill.tsx:15-21,40-52,66-71`
- **Description**: `BUCKET_VISUAL` distinguishes statuses by a coloured dot plus a shared-style text label. In the inline (table) variant the only status-specific non-text visual is the dot, which is `aria-hidden`. The spec mandates text **+ distinct icon per status** (warning for token expired, error for unreachable), never colour alone, for WCAG 2.1 AA. No iconography present.
- **Spec Reference**: Rule 1 E1/E2/E3; Technical Rule T5
- **Suggested Fix**: Add a distinct, non-`aria-hidden` icon per bucket (check / warning-triangle / error-circle) alongside the label; keep colour as redundant reinforcement only.

---

#### [MEDIUM] `no_auth` (no credentials) is mislabeled "Unreachable"

- **Category**: Bug / Inconsistency
- **File**: `apps/frontend/src/domain/git/components/shared/connectionStatus.ts:70-71`
- **Description**: `toStatusBucket` maps `{kind:'no_auth'}` → `unreachable` ("Unreachable" + red dot + error description). `no_auth` means no stored token/installation — not a network/5xx unreachability (E3 is specifically non-auth errors). Conflating "no credentials" with "Unreachable" gives a misleading diagnosis (transient infra error vs add-credentials). Surfaces in the drawer even though the per-row probe is gated by `enabled:hasAuth`.
- **Spec Reference**: Rule 1 E3, E4
- **Suggested Fix**: Give `no_auth` its own bucket/label (e.g. "Not connected" / "No credentials").

---

#### [MEDIUM] "Status unknown" / "Checking…" buckets render in the UI (E4)

- **Category**: Technical Rule Violation / Edge Case
- **File**: `apps/frontend/src/domain/git/components/shared/connectionStatus.ts:42-46,60-75`; `apps/frontend/src/domain/git/components/shared/ConnectionStatusPill.tsx:17,20`
- **Description**: E4 requires the closed set Connected/Token expired/Unreachable with no "unknown"/"never checked" in the UI. `deriveConnectionStatus` returns `{kind:'unknown'}` on any thrown error (our own API 500, the backend's generic `Error('Git provider not found')`, or a network failure reaching our API); `retry:false` means no recovery. `BUCKET_VISUAL` then renders literal "Status unknown" (and "Checking…"), both disallowed end states.
- **Spec Reference**: Rule 1 E4
- **Suggested Fix**: Map probe `isError`/undefined-data to `unreachable` instead of `unknown`; remove the `unknown` label; treat `checking` as a transient loading affordance, not a status value.

---

#### [MEDIUM] Last-push query ignores soft-deleted targets/repos

- **Category**: Bug / Standards Violation
- **File**: `packages/deployments/src/infra/repositories/DistributionRepository.ts:1780-1796`
- **Description**: Inner-joins `distribution.target → target.gitRepo`. `TargetSchema` is `WithSoftDelete`. Soft-delete filtering on **joined** relations via QueryBuilder is not automatic; the query neither calls `withDeleted()` nor filters `target.deletedAt IS NULL`. A successful distribution whose target was later soft-deleted could still contribute its timestamp — surfacing a "last push" for a connection whose target no longer exists.
- **Spec Reference**: Standard: Back-end repositories SQL queries using TypeORM
- **Suggested Fix**: Decide intended semantics; add explicit `target.deletedAt IS NULL` (or `withDeleted()`), and add a test exercising it.

---

#### [MEDIUM] No test for `GetLastDistributionDateByProvidersUseCase`; aggregation correctness mocked away

- **Category**: Test Gap
- **File**: `packages/deployments/src/application/useCases/GetLastDistributionDateByProvidersUseCase.ts` (no spec); `packages/deployments/src/infra/repositories/DistributionRepository.spec.ts:2005-2086`
- **Description**: The use case has no spec. The repo spec stubs `getRawMany` and only asserts on `andWhere`/`groupBy` mock calls — never real SQL. The real data-integrity risk (soft-deleted-target inclusion) lives precisely in the mocked-away layer, so tests can't catch the regression.
- **Spec Reference**: Standard: Backend Tests Redaction
- **Suggested Fix**: Add an integration-style repo test against a real datasource (soft-deleted target, multi-provider max); add a use-case unit test for empty-providerIds short-circuit + map translation.

---

#### [LOW] `check-auth` / provider-not-found throw generic `Error` → 500 instead of 404

- **Category**: Bug / Standards Violation
- **File**: `packages/git/src/application/useCases/checkProviderAuth/checkProviderAuth.usecase.ts:43,48`; `packages/git/src/application/GitProviderService.ts:97`
- **Description**: Missing/other-org provider throws `new Error('Git provider not found')`. NestJS maps a bare `Error` to HTTP 500, not 404. On the frontend this lands the probe in the `unknown` bucket (see E4 finding) and logs an error.
- **Spec Reference**: Standard: Back-end TypeScript Clean Code Practices
- **Suggested Fix**: Throw a domain `GitProviderNotFoundError` (mapped to `NotFoundException`/404) so the API returns a proper status and the client can distinguish "not found" from a transient failure.

---

#### [LOW] GitHub secondary rate limit (403 without `x-ratelimit-remaining: 0`) mislabeled `forbidden`

- **Category**: Edge Case
- **File**: `packages/git/src/infra/repositories/github/GithubProvider.ts:251-257`
- **Description**: 403 disambiguation relies solely on `x-ratelimit-remaining === '0'`. GitHub secondary rate limits also return 403 but signal via `retry-after` (and/or a body message) rather than zeroing `x-ratelimit-remaining`. Those map to `forbidden` → `unreachable` with "denied access / check scopes", steering the admin toward a permissions fix for an actual transient throttle.
- **Spec Reference**: Rule 1 E3
- **Suggested Fix**: Also treat 403 with `retry-after` (or the documented secondary-rate-limit body signature) as `rate_limited`.

### Verified as NOT problems

- **T4 leak**: provider warn logs carry only `kind`/`reason`/`status` — no token, no body. Frontend never receives raw vendor bodies (contract is `{ok:false; reason}`); `describeFailure` returns static canned strings. No secret/PII leak.
- **Contract/DTO shape**: `GitProviderListItem = GitProviderWithoutToken & { lastDistributionAt }` and `GitProviderUI = Omit<GitProvider,…> & {…}` use intersection (Typescript-good-practices compliant). New contract exports exactly Command/Response/IUseCase and is barrel-exported.
- **Hexagonal wiring**: both use cases registered in adapters, reached via ports; services use single command objects. No missing registration.
- **TypeORM parameterization**: aggregation query uses parameterized `where`/`andWhere` and `IN (:...providerIds)` — compliant (only the soft-delete gap above).

### Pre-existing standards note (not attributed to this story)

- **Frontend Data Flow** (alwaysApply): route `org.$orgSlug._protected.settings.git._index.tsx` has no `clientLoader`/`useLoaderData` and isn't named with the `RouteModule` pattern — data is fetched inside components via hooks. Violates the standard but predates this story (thin wrapper route). To count it in scope, add a `clientLoader` using `queryClient.ensureQueryData()` with exported query-options functions.

## Deferred Items

None — the spec contained no TBD / deferred items.

---

_Static analysis only. No code was executed during this review._
