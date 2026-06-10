# QA Review Report

**Spec**: 597.md | **Date**: 2026-06-08 | **Branch**: main | **Commit**: e45faf0a7
**Rules**: 1 | **Examples**: 5 | **Tech Rules**: 3 | **Events**: 0

## Summary

| Metric               | Count                                       |
| -------------------- | ------------------------------------------- |
| Covered              | 5                                           |
| Partially Covered    | 2                                           |
| Not Covered          | 1                                           |
| Code Findings        | 6 (Critical: 0, High: 2, Medium: 3, Low: 1) |
| Standards Violations | 0 (all 5 applicable standards pass)         |

**Scope reviewed**: Frontend (`apps/frontend`), API (`apps/api`), CLI (`apps/cli`), Packages (`packages/*`). The feature is implemented under the `git provider` domain using the `displayName` vocabulary (backend keeps `source`/vendor terms — per spec).

## Functional Coverage

### Coverage Matrix

| ID    | Rule / Item                                                                                                        | Layer               | Status                | Evidence                                                                                                                                                                                                                                                                                                                                                                           | Test Coverage                                                                                      |
| ----- | ------------------------------------------------------------------------------------------------------------------ | ------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| R1-S1 | Empty display name shows muted placeholder in list; stored value is empty string                                   | Frontend            | Covered               | `ConnectionsTable.tsx:114-155` renders `vendorPlaceholder()` (`Unnamed GitHub connection` l.414) with `color="faded"` + `fontStyle="italic"` when `displayName.trim().length === 0`. Read default `displayName ?? ''` (`GitProviderGatewayApi.ts:122`).                                                                                                                            | No frontend test (`ConnectionsTable.tsx` NOT FOUND).                                               |
| R1-S1 | (same) underlying stored value empty                                                                               | Backend/Infra       | Covered               | Column `display_name varchar(64) NOT NULL DEFAULT ''` (`migration 1780577369702:20`); schema default `''` (`GitProviderSchema.ts:49-54`); `normalizeDisplayName(null/undefined)→''` (`validateDisplayName.ts:16-21`).                                                                                                                                                              | `git-providers.service.spec.ts:589` (empty default).                                               |
| R1-S2 | Edit display name via row actions; persisted; list reflects immediately; trimmed                                   | Frontend            | Covered               | Row "Edit" opens drawer (`ConnectionsTable.tsx:327-334`); `DisplayNameEditor.tsx` trims (l.49,123) + saves via `useUpdateGitProviderMutation`; invalidates `GET_GIT_PROVIDERS_KEY` (`GitProviderQueries.ts:125-132`); gateway sends `displayName` only when defined (`GitProviderGatewayApi.ts:147`).                                                                              | No frontend test (`DisplayNameEditor`/`ConnectionDrawer` NOT FOUND).                               |
| R1-S2 | (same) trim before validation/persistence                                                                          | Backend             | Covered               | `normalizeDisplayName()` trims (`validateDisplayName.ts:20`); use case normalizes before uniqueness + persist (`updateGitProvider.usecase.ts:114-135`).                                                                                                                                                                                                                            | `updateGitProvider.usecase.spec.ts:251-279` (`'  Marketplace (prod)  '` → `'Marketplace (prod)'`). |
| R1-S3 | Max length 64, capped with visible counter; save explains limit if paste exceeded                                  | Frontend            | **Partially Covered** | Counter `{draft.length}/{MAX_LENGTH}` (`DisplayNameEditor.tsx:171`); input `maxLength={64}` + `onChange` slices to 64 (l.179,189). **Missing**: no message explaining the limit when a paste exceeds 64 — paste is silently truncated.                                                                                                                                             | No test (NOT FOUND).                                                                               |
| R1-S4 | Unique within org (case-insensitive, trimmed); inline error; existing unaffected                                   | Frontend            | Covered               | Local case-insensitive collision check `otherNames.some(...)` (`DisplayNameEditor.tsx:51-56`), inline error via `role="alert"` (l.58-61,217-225); `otherNames` excludes self (`ConnectionDrawer.tsx:364-370`); server error surfaced as `serverError` (l.125-130).                                                                                                                 | No frontend test (NOT FOUND).                                                                      |
| R1-S4 | (same) backend uniqueness                                                                                          | API/Backend/Infra   | Covered               | `ensureDisplayNameAvailable()` case-insensitive + trims + throws AlreadyUsed (`validateDisplayName.ts:38-50`); use case checks siblings excluding self (`updateGitProvider.usecase.ts:119-135`); controller maps to 409 (`git-providers.controller.ts:527-528`); DB partial unique index on `(organization_id, lower(display_name)) WHERE display_name <> ''` (`migration:27-30`). | `updateGitProvider.usecase.spec.ts:282-311`; `git-providers.controller.spec.ts:613-622` (→409).    |
| R1-S5 | Two empty display names coexist without uniqueness error                                                           | Frontend            | Covered               | Editor collision guarded by `trimmed.length > 0` (`DisplayNameEditor.tsx:53`); list renders placeholders per row, no cross-row uniqueness (`ConnectionsTable.tsx:114-155`).                                                                                                                                                                                                        | No frontend test (NOT FOUND).                                                                      |
| R1-S5 | (same) backend allows empty coexistence                                                                            | Backend/Infra       | Covered               | `ensureDisplayNameAvailable` early-returns when `normalized.length === 0` (`validateDisplayName.ts:34-36`); use case skips check unless `length > 0` (`updateGitProvider.usecase.ts:119-122`); DB index excludes empty via `WHERE display_name <> ''` (`migration:29`).                                                                                                            | `updateGitProvider.usecase.spec.ts:379-383` (uniqueness lookup NOT called when clearing to empty). |
| T1    | Display-name edits emit audit log with `actor_id`, `connection_id`, `old_value_present`, `new_value_present`, `at` | Backend / Events    | **Not Covered**       | No event emitted. `updateGitProvider.usecase.ts` + `GitProviderService.ts` call repo only. No `packages/types/src/git/events/` dir; no rename event class; `AmplitudeEventListener` has no rename subscription. Only trace: generic `logger.info` (`git-providers.controller.ts:515-521`) logging `organizationId`+`gitProviderId` (wrong fields).                                 | None.                                                                                              |
| T2    | Edit dialog keyboard-reachable, focus-trapped, errors announced via `aria-live`                                    | Frontend            | **Partially Covered** | Keyboard OK: Enter saves / Escape cancels (`DisplayNameEditor.tsx:143-152`), `autoFocus` (l.176), Escape-to-close suppressed while editing (`ConnectionDrawer.tsx:93`). Errors via `role="alert"` (≈`aria-live="assertive"`) not literal `aria-live`. **Missing**: editor is inline (not a modal dialog) — no editor-scoped focus trap; relies on `PMDrawer`.                      | No test (NOT FOUND).                                                                               |
| T3    | Rename is UI-only — backend keeps `provider` vocabulary                                                            | Backend/Infra/Types | Covered               | `source: GitProviderVendor` + `GitProviderVendors` retained (`GitProvider.ts:6-13,30`); schema `source` column kept (`GitProviderSchema.ts:28-30`); `displayName` purely additive. CLI-created providers blocked from rename via `GitProviderDisplayNameNotEditableError` (`updateGitProvider.usecase.ts:77-82`).                                                                  | `updateGitProvider.usecase.spec.ts:386-441` (CLI-managed block + app-provider allow).              |

### Gaps

#### [R1-S3] Paste over 64 chars is silently truncated — no explanation shown

**Status**: Partially Covered
**What is missing**: Scenario 3 requires "the save action explains the limit if a paste attempt exceeded it." The 64-cap and visible counter exist, but a paste over 64 is silently sliced in the `onChange` handler with no message. `overLimit` (`DisplayNameEditor.tsx:57`) can never be true via paste (value is capped before state is set) — it only ever equals exactly 64, which merely tints the counter `warning`.
**Where to look**: `apps/frontend/src/domain/git/components/ConnectionDrawer/DisplayNameEditor.tsx:57,168-172,178-183,189`; create-side same pattern `AddConnection/AddConnectionDrawer.tsx:453-459`.
**How to reproduce**:

1. Open a connection drawer → Rename → paste a 100-char string into the display-name input.
2. Observed: field keeps the first 64 chars; counter shows `64/64` (tinted) but no message explains the truncation. Expected: a visible explanation that the paste exceeded the 64-char limit.

#### [T1] No audit log / domain event on display-name edit

**Status**: Not Covered
**What is missing**: No audit entry or domain event is written on display-name edit. The spec requires `actor_id`, `connection_id`, `old_value_present`, `new_value_present`, `at`. None of these fields exist anywhere; there is no git-provider events directory, no rename event class, and the Amplitude listener subscribes to no rename event. The generic controller `logger.info` records only `organizationId`+`gitProviderId`.
**Where to look**: `packages/git/src/application/useCases/updateGitProvider/updateGitProvider.usecase.ts:114-138` (emits nothing); `packages/git/src/application/GitProviderService.ts` (repo call only); `packages/types/src/git/` (no `events/` dir); `packages/amplitude/src/application/AmplitudeEventListener.ts:96-149` (no rename subscription — compare `SpaceRenamedEvent` l.137 which exists for spaces); `apps/api/.../git-providers.controller.ts:515-521` (generic log, wrong fields).
**How to reproduce**:

1. As org admin, rename a connection from `Production marketplace` to `Marketplace (prod)`.
2. Inspect emitted domain events / audit log. Observed: nothing emitted (only generic info log). Expected: an audit entry with the five named fields.

#### [T2] Error announcement uses `role="alert"` (not `aria-live`); no dedicated focus trap on the inline editor

**Status**: Partially Covered
**What is missing**: (1) Validation errors are announced via `role="alert"` rather than the literal `aria-live` named in the spec — functionally equivalent (`role="alert"` implies `aria-live="assertive"`), a wording deviation. (2) The spec says the edit dialog is "focus-trapped," but the rename UI is an inline editor in the drawer body, not a modal dialog; focus trapping is provided only by the surrounding `PMDrawer`, with no trap scoped to the editor. Keyboard reachability + Enter/Escape are correct.
**Where to look**: `DisplayNameEditor.tsx:143-152` (keyboard), `:176` (autoFocus), `:187-188,217-225` (`role="alert"`/`aria-invalid`/`aria-describedby`); `ConnectionDrawer.tsx:79-93` (drawer-level escape/focus).
**How to reproduce**:

1. Open the rename editor and trigger a duplicate-name error with a screen reader active.
2. Observed: error announced via `role="alert"` (works); no editor-scoped focus trap. Expected per spec wording: an `aria-live` region and a focus-trapped dialog. Functionally close on announcement; the dialog/focus-trap expectation is not literally met (inline editor, drawer-level trap only).

## Code Review

### Findings

#### [HIGH] Backend does not handle the DB unique-constraint violation; concurrent renames to the same name crash with a raw 500

- **Category**: Bug / Edge Case
- **File**: `packages/git/src/application/useCases/updateGitProvider/updateGitProvider.usecase.ts:119-136`, `packages/git/src/infra/repositories/GitProviderRepository.ts:244-283`, `apps/api/src/app/organizations/git/providers/git-providers.controller.ts:523-544`
- **Description**: Uniqueness is enforced by an app-level read-then-write check (`ensureDisplayNameAvailable` over `findGitProvidersByOrganizationId`) AND the partial unique index `git_providers_display_name_unique_per_org`. Between the SELECT and `repository.save()`, two concurrent admin requests can both pass the app check; one `save()` then hits the Postgres unique violation (SQLSTATE 23505). Nothing catches `QueryFailedError`/23505 (confirmed: no such handling in the git package or API git layer), so the losing request surfaces a raw 500 instead of the intended 409. The DB index protects integrity (no duplicate written), but the user-facing behavior under contention is a crash — violating S4's "reject duplicate with inline error." Same gap on the create path (`addGitProvider.usecase.ts:61-71`).
- **Spec Reference**: Rule 1 / S4 (unique within org)
- **Suggested Fix**: Catch the Postgres unique violation (code `23505`, constraint `git_providers_display_name_unique_per_org`) in `GitProviderRepository.update`/`add` (or the use case) and rethrow as `GitProviderDisplayNameAlreadyUsedError` so the controller maps it to 409.

---

#### [HIGH] Display-name edit audit log (T1) is entirely unimplemented

- **Category**: Technical Rule Violation
- **File**: `packages/git/src/application/useCases/updateGitProvider/updateGitProvider.usecase.ts`, `packages/git/src/application/GitProviderService.ts`, `apps/api/.../git-providers.controller.ts`
- **Description**: T1 requires every display-name edit to emit an audit entry with `actor_id`, `connection_id`, `old_value_present`, `new_value_present`, `at`. A repo-wide search for these fields and any rename event returns nothing; no `packages/types/src/git/events/` dir, the use case/service emit no event, `AmplitudeEventListener` subscribes to no rename event. The use case has the old value (`existingProvider.displayName`), new value (`normalizedDisplayName`), and actor (`command.userId`) in hand but records nothing. The feature ships with zero audit trail for renames.
- **Spec Reference**: Technical Rule T1
- **Suggested Fix**: Define a `GitProviderDisplayNameUpdatedEvent` (per the Domain Events pattern, under `packages/types/src/git/events/`) carrying `actorId`/`connectionId`/`oldValuePresent`/`newValuePresent`/`at` (booleans, not raw names — consistent with the spec's privacy-conscious design and the Logging-PII standard), emit it from the use case after a successful rename, and subscribe in the listener. If surfaced to Amplitude, the event name must be snake_case ending in the verb (e.g. `git_provider_renamed`) with lowerCamelCase props.

---

#### [MEDIUM] `UpdateGitProviderCommand` contract is inline and not exported from `@packmind/types`

- **Category**: Inconsistency / Hexagonal convention
- **File**: `packages/git/src/application/useCases/updateGitProvider/updateGitProvider.usecase.ts:23-26`
- **Description**: `UpdateGitProviderCommand` is declared inline in the use-case file and is NOT exported from the `@packmind/types` contracts barrel. Every other git use-case command (`AddGitProviderCommand`, `ListProvidersCommand`, …) lives under `packages/types/src/git/contracts/`. There is no `IUpdateGitProviderUseCase` interface either, so `IGitPort.updateGitProvider` (`:253`) re-declares params positionally (`id, gitProvider, userId, organizationId`) instead of taking the command object — a contract-location/consistency drift versus the rest of the domain.
- **Spec Reference**: Hexagonal architecture / use-case contract convention
- **Suggested Fix**: Move `UpdateGitProviderCommand` (+ `Response`/`I…UseCase`) into `packages/types/src/git/contracts/IUpdateGitProviderUseCase.ts`, export from the barrel, and import it in the use case, adapter, and port.

---

#### [MEDIUM] `validateDisplayName.ts` — the core normalize/uniqueness logic — has no unit tests

- **Category**: Missing test coverage
- **File**: `packages/git/src/application/useCases/shared/validateDisplayName.ts` (no `.spec.ts`)
- **Description**: `normalizeDisplayName` (trim → 64-cap → null/undefined→'') and `ensureDisplayNameAvailable` (case-insensitive collision, empty-bypass, ignore-self) are the single source of truth for S2/S3/S4/S5 and are shared by both add and update paths, yet there is no dedicated test file — only indirect coverage via the two use-case specs. Untested edge cases: a name exactly 64 chars after trimming; a name whose trailing whitespace pushes it past 64 before trim (e.g. 60 chars + 10 spaces); the ignore-self branch (`provider.id !== ignoreProviderId`).
- **Spec Reference**: S2 / S3 / S4 / S5 (core validation)
- **Suggested Fix**: Add `validateDisplayName.spec.ts` covering trim+cap boundaries, null/undefined, case-insensitive collision, empty bypass, and ignore-self.

---

#### [MEDIUM] T2 a11y: validation errors not announced via `aria-live`; focus not trapped in an edit dialog

- **Category**: Technical Rule Violation
- **File**: `apps/frontend/src/domain/git/components/ConnectionDrawer/DisplayNameEditor.tsx:217-225`, `ConnectionDrawer.tsx:73-116`
- **Description**: T2 requires the edit affordance to be keyboard-reachable, focus-trapped, and to announce validation errors via `aria-live`. The error uses `role="alert"` (assertive live region) — partially satisfies announcement but not the literal `aria-live` surface the spec names. The implementation is an inline editor inside the drawer body (not a modal dialog), so there is no focus trap around the rename control itself — focus management relies on the surrounding `PMDrawer`. Enter/Escape + `autoFocus` are handled (`:143-152`, `:176`), Escape-to-close suppressed while editing (`ConnectionDrawer.tsx:93`), so keyboard reachability is mostly met.
- **Spec Reference**: Technical Rule T2
- **Suggested Fix**: If a dialog is intended, move the editor into a focus-trapped modal; otherwise confirm the inline pattern is acceptable and add an explicit `aria-live="assertive"` (or keep `role="alert"`, documenting equivalence).

---

#### [LOW] Frontend over-limit indicator triggers at exactly 64 chars (`>=` vs `>`)

- **Category**: Edge Case
- **File**: `apps/frontend/src/domain/git/components/ConnectionDrawer/DisplayNameEditor.tsx:57`
- **Description**: `const overLimit = draft.length >= MAX_LENGTH;` turns the `64/64` counter to the `warning` color when the user reaches exactly 64 valid characters, even though 64 is the allowed maximum (input is hard-capped at 64 via `slice(0, MAX_LENGTH)` + `maxLength`). A legitimately full-length name shows a warning state. Purely cosmetic — value is still valid and saveable. The backend correctly treats 64 as allowed (no off-by-one in persistence).
- **Spec Reference**: S3 (max length 64, visible counter)
- **Suggested Fix**: Use `draft.length > MAX_LENGTH` for the warning color, or keep `>=` only as a non-warning "at limit" cue.

### Standards Compliance (all 5 applicable standards pass)

Verified clean — no violations to report:

- **Packmind Proprietary** — no `@packmind/editions` imports in any Code Map file.
- **Typescript good practices** — the two new error classes (`GitProviderDisplayNameAlreadyUsedError`, `GitProviderDisplayNameNotEditableError`) use `Error.captureStackTrace`, not `Object.setPrototypeOf`. `GitProviderUI`/`GitProviderWithoutToken`/`GitProviderListItem` use intersection types (no manual field re-declaration).
- **Compliance – Logging Personal Information** — no raw display name or actor email logged; the controller logs only ids + `providerSource`.
- **Backend Tests Redaction** — existing specs (`updateGitProvider`, `addGitProvider`, controller) use `stubLogger()`, `afterEach(jest.clearAllMocks())`, nested `describe('when…')`, verb-first names, and test real behavior rather than mocking it away.
- **Amplitude analytics usage** — no existing git event violates the convention; relevant to T1 if/when the rename event is added (use `git_provider_renamed`-style snake_case + lowerCamelCase props).

## Deferred Items

- **Allowing rename on CLI-managed entries** — Out of scope (separate CLI-managed read-only tab issue). Not assessed. Note: the backend already blocks it via `GitProviderDisplayNameNotEditableError` (`updateGitProvider.usecase.ts:77-82`).

---

_Static analysis only. No code was executed during this review._
