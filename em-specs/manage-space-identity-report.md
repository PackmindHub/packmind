# QA Review Report

**Spec**: manage-space-identity.md | **Date**: 2026-04-17 | **Branch**: feat/manage-space-identity | **Commit**: b14cd2686
**Rules**: 5 | **Examples**: 10 | **Tech Rules**: 4 | **Events**: 1 | **Check-Also**: 4

## Summary

| Metric               | Count                                         |
| -------------------- | --------------------------------------------- |
| Covered              | 14                                            |
| Partially Covered    | 3                                             |
| Not Covered          | 1                                             |
| Code Findings        | 24 (Critical: 0, High: 5, Medium: 14, Low: 5) |
| Standards Violations | 6                                             |

## Functional Coverage

### Coverage Matrix

| ID    | Item                                                         | Status            | Evidence                                                                                                                                                                                                                                                                                                                                                                                          |
| ----- | ------------------------------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1.E1 | Space admin of "oddity" can update identity                  | Covered           | `UpdateSpaceUseCase.ts:52-64`; `ManageSpaceIdentity.spec.ts:18-41`; `UpdateSpaceUseCase.spec.ts:133-148`                                                                                                                                                                                                                                                                                          |
| R1.E2 | Org admin can update identity                                | Partially Covered | `UpdateSpaceUseCase.ts:52-53` + spec 87-131 (unit); no E2E for org-admin-only path                                                                                                                                                                                                                                                                                                                |
| R1.E3 | Plain space member cannot update identity                    | Covered           | `UpdateSpaceUseCase.ts:58-63` + spec 150-165 (unit). Accepted without E2E.                                                                                                                                                                                                                                                                                                                        |
| R2.E1 | Rename keeps slug stable                                     | Covered           | `UpdateSpaceUseCase.ts:85-89`; `SpaceService.ts:157-194` never updates slug; `ManageSpaceIdentity.spec.ts:18-41`                                                                                                                                                                                                                                                                                  |
| R2.E2 | Warning after rename when slug no longer matches             | Partially Covered | `SpaceIdentitySection.tsx:36-45` shows warning while typing (pre-save); no assertion in any test                                                                                                                                                                                                                                                                                                  |
| R3.E1 | Slug-colliding rename rejected                               | Covered           | `SpaceService.ts:169-183`; `SpaceService.spec.ts:51-72`; `ManageSpaceIdentity.spec.ts:43-65`                                                                                                                                                                                                                                                                                                      |
| R4.E1 | Color shared across all org users                            | Covered           | Persisted in `SpaceSchema.ts:35-39`, served via org-scoped list `SpaceRepository.ts:72-89`. Accepted without cross-user test.                                                                                                                                                                                                                                                                     |
| R5.E1 | Admin can change default space color                         | Covered           | `UpdateSpaceUseCase.ts:66-70` (rename block only); `UpdateSpaceUseCase.spec.ts:183-190`; `ManageSpaceIdentity.spec.ts:67-83`                                                                                                                                                                                                                                                                      |
| R5.E2 | Admin cannot rename default space                            | Covered           | `UpdateSpaceUseCase.ts:66-70`; spec 167-191; controller maps to 422 (`controller.ts:291-293`; spec 338-355); `SpaceIdentitySection.tsx:33,89-97`; `ManageSpaceIdentity.spec.ts:73-75`                                                                                                                                                                                                             |
| TR1   | Unauthorized form visible but disabled; backend rejects      | Covered           | `SpaceGeneralSettings.tsx:20-34` (canEdit); `SpaceIdentitySection.tsx:33-34,89,106,136`; `UpdateSpaceUseCase.ts:52-64` throws; `controller.ts:294-296` maps 403                                                                                                                                                                                                                                   |
| TR2   | Default space: name field present but disabled               | Covered           | `SpaceIdentitySection.tsx:32-33,89-104`; `ManageSpaceIdentity.spec.ts:73-75` asserts `isNameDisabled`                                                                                                                                                                                                                                                                                             |
| TR3   | Rename must not update slug                                  | Covered           | `UpdateSpaceUseCase.ts:85-89`; `SpaceService.ts:157-194` never writes slug; `SpaceRepository.ts:108-111` only writes slug if provided                                                                                                                                                                                                                                                             |
| TR4   | Slug uniqueness per-organization enforced before persistence | Covered           | `SpaceService.ts:169-181`; `SpaceSchema.ts:54-59` unique index on `(slug, organizationId)`; `SpaceService.spec.ts:51-72`                                                                                                                                                                                                                                                                          |
| UE1   | `space_renamed` event emitted                                | Not Covered       | Internal `SpaceRenamedEvent` fires at `UpdateSpaceUseCase.ts:91-103`, but `AmplitudeEventListener` (`packages/amplitude/src/application/AmplitudeEventListener.ts:46-90`) does not subscribe to it — sibling events like `SpaceCreatedEvent`/`SpaceDeletedEvent`/`SpaceVisibilityUpdatedEvent` are wired but `SpaceRenamedEvent` is missing, so the `space_renamed` Amplitude event is never sent |
| CA1   | Updates cover both name and color                            | Covered           | `UpdateSpaceUseCase.ts:66-89`; `SpaceService.ts:169-193`; `UpdateSpaceUseCase.spec.ts:92-108`                                                                                                                                                                                                                                                                                                     |
| CA2   | Warning surfaced when slug no longer matches updated name    | Partially Covered | `SpaceIdentitySection.tsx:36-45` shows pre-save only; no test                                                                                                                                                                                                                                                                                                                                     |
| CA3   | Color propagated to all org users                            | Covered           | Persisted org-scoped (`SpaceSchema.ts:35-39`). Accepted without cross-user test.                                                                                                                                                                                                                                                                                                                  |
| CA4   | Default-space rename restriction applies regardless of role  | Covered           | `UpdateSpaceUseCase.ts:66-70` runs after role check, for all authorized callers; spec 167-181                                                                                                                                                                                                                                                                                                     |

### Gaps

- **[Severity: Low] R1.E2 Org-admin happy path lacks E2E coverage**
  - Expected: E2E where an org admin (not space admin) updates identity.
  - Actual: Only space-admin E2E exists; unit test in `UpdateSpaceUseCase.spec.ts:87-131` covers behavior.
  - Repro: Check `apps/e2e-tests/src/features/spaces-management/ManageSpaceIdentity.spec.ts` — no test where the acting user is only an org admin.
  - Fix hint: Add an E2E using `testWithUser` where user has org-admin role but no space membership.

- **[Severity: Medium] R2.E2 / CA2 Slug-mismatch warning is pre-save, not post-save; untested**
  - Expected: "After the update, he sees a warning that the slug does not match the name anymore."
  - Actual: `SpaceIdentitySection.tsx:36-45` computes `slugMismatchWarning` from the live `name` state; it appears while typing, before save. No assertion (unit, component, or E2E) exists.
  - Repro: Trace `name` → `slug(name)` vs `space.slug` in `SpaceIdentitySection.tsx:36-45`.
  - Fix hint: Either tweak copy to a post-save confirmation, or add an E2E assertion after `waitForIdentityUpdateSuccess` that the warning text is still present; add a unit test for the `slugMismatchWarning` branch.

- **[Severity: High] UE1 `space_renamed` Amplitude event is never sent**
  - Expected: Amplitude receives a `space_renamed` event on successful rename (sibling of `space_created`, `space_deleted`, `space_visibility_updated`).
  - Actual: Internal `SpaceRenamedEvent` (`packages/types/src/spaces/events/SpaceRenamedEvent.ts:12`, eventName `spaces.space.renamed`) is emitted by `UpdateSpaceUseCase.ts:91-103`, but `AmplitudeEventListener` (`packages/amplitude/src/application/AmplitudeEventListener.ts:46-90`) neither imports nor subscribes to it. Every other sibling space event IS wired.
  - Repro: Search for `SpaceRenamedEvent` in `packages/amplitude/src/application/AmplitudeEventListener.ts` — no match.
  - Fix hint: Add `SpaceRenamedEvent` to the imports and add `this.subscribe(SpaceRenamedEvent, this.onSpaceRenamed)` with an `emitAmplitudeEvent(event, 'space_renamed', ...)` handler mirroring the existing sibling handlers.

## Code Review

### Findings

#### High

- **[High] Controller silently drops empty rename attempts** — `packages/spaces-management/src/nest-api/spaces-management/spaces-management.controller.ts:280`
  - What: `name: body.name?.trim() || undefined` converts empty string to `undefined`, so a rename to `""` is silently ignored instead of raising a validation error.
  - Why it matters: Lost validation feedback; UI may think the save succeeded.
  - Fix hint: When `body.name` is present and empty after trim, throw `BadRequestException`.

- **[High] Event `source` hard-coded to `'ui'`** — `UpdateSpaceUseCase.ts:96,110`, controller at `:276-283`
  - What: Controller does not set `source` on the command; use case defaults to `'ui'` for both events. MCP-initiated updates will be mislabeled as UI.
  - Why it matters: Domain-event telemetry misattribution.
  - Fix hint: Propagate `source` from request context (header or request-scoped provider).

- **[High] `AddColorToSpaces` migration not transactional** — `packages/migrations/src/migrations/1803000000000-AddColorToSpaces.ts:16-36`
  - What: Adds nullable column, backfills, sets NOT NULL in separate statements without a transaction.
  - Why it matters: If backfill fails partway, `SET NOT NULL` blocks and the migration is left in an inconsistent state.
  - Fix hint: Wrap in `queryRunner.startTransaction()` or batch via `UPDATE … FROM (VALUES …)` in a single statement.

- **[High] `SpaceRepository.updateFields` throws generic `Error`** — `packages/spaces/src/infra/repositories/SpaceRepository.ts:105`
  - What: `throw new Error('Space ${id} not found')`.
  - Why it matters: Standards violation (Back-end TypeScript Clean Code Practices): "Use dedicated error types instead of generic Error instances." Prevents proper 404 mapping in controllers.
  - Fix hint: Throw `SpaceNotFoundError`.

- **[High] `SpaceService.updateSpace` throws generic `Error` for not-found** — `packages/spaces/src/application/services/SpaceService.ts:171-172`
  - What: `throw new Error('Space ${spaceId} not found')`.
  - Why it matters: Controller only catches `SpaceNotFoundError`; a concurrent deletion surfaces as HTTP 500. Same standards violation as above.
  - Fix hint: Throw `SpaceNotFoundError` from `@packmind/spaces`.

#### Medium

- **[Medium] Generic PATCH handles multiple business actions** — `packages/spaces-management/src/nest-api/spaces-management/spaces-management.controller.ts:261-302`
  - What: `PATCH /spaces-management/:spaceId` accepts `{ name?, type?, color? }`, firing `SpaceRenamedEvent` or `SpaceVisibilityUpdatedEvent` based on body.
  - Why it matters: REST API Endpoint Design standard: "Dedicated action endpoints (e.g., `/rename`) over generic PATCH with status body" — these are distinct business actions.
  - Fix hint: Split into `PATCH :spaceId/identity` (name+color) and `PATCH :spaceId/visibility` (type), each with its own command/use case.

- **[Medium] `UpdateSpaceUseCase` uses `AbstractMemberUseCase` instead of `AbstractSpaceMemberUseCase`** — `packages/spaces-management/src/application/usecases/UpdateSpaceUseCase.ts:25`
  - What: Command extends `SpaceMemberCommand` (spaceId-carrying), but the use case extends `AbstractMemberUseCase` and re-checks space membership via `findMembership`.
  - Why it matters: Use Case Architecture Patterns standard prescribes `AbstractSpaceMemberUseCase` for spaceId-scoped commands.
  - Fix hint: Refactor to `AbstractSpaceMemberUseCase`; handle org-admin bypass uniformly.

- **[Medium] Slug-conflict error maps to misleading copy** — `apps/frontend/src/domain/spaces/components/SpaceIdentitySection.tsx:67`
  - What: HTTP 409 is surfaced as "Another space with a similar name already exists." Combined with the Critical slug-check issue, users can see this on non-colliding names.
  - Why it matters: UX / Frontend Error Management standard: "Inline validation near the field for form errors."
  - Fix hint: Render inline under the Name field; align copy with the actual backend semantics after the Critical fix.

- **[Medium] Validation errors use toasts rather than inline field errors** — `apps/frontend/src/domain/spaces/components/SpaceIdentitySection.tsx:62-76`
  - What: `InvalidSpaceColorError` (400) and slug-conflict (409) are surfaced only via `pmToaster`, not near the offending field.
  - Why it matters: Frontend Error Management standard: "Display validation errors inline near the relevant form fields."
  - Fix hint: Render `PMField.ErrorText` under Name / Color.

- **[Medium] `SpacesManagementService` logger has no default value** — `packages/spaces-management/src/nest-api/spaces-management/spaces-management.service.ts:29-32`
  - What: Constructor requires `logger: PackmindLogger` with no default, relying on Nest DI.
  - Why it matters: Back-end TypeScript Clean Code Practices: "Inject PackmindLogger as a constructor parameter with a default value."
  - Fix hint: Add `= new PackmindLogger('SpacesManagementService')` default.

- **[Medium] Missing test: slug is preserved after rename (TR3)** — `packages/spaces-management/src/application/usecases/UpdateSpaceUseCase.spec.ts`
  - What: No test asserts that `Space.slug` is unchanged after a successful rename.
  - Why it matters: Core TR3 rule has no direct unit assertion.
  - Fix hint: Add a unit test asserting `space.slug === originalSlug` after rename.

- **[Medium] Missing test: slug conflict aborts before persistence (TR4)** — `packages/spaces-management/src/application/usecases/UpdateSpaceUseCase.spec.ts`
  - What: No test asserts `updateFields` is not called when slug conflicts.
  - Why it matters: TR4 "rejected before persistence" lacks use-case-layer coverage.
  - Fix hint: Stub `findBySlug` to return another space; assert `SpaceSlugConflictError` + `updateFields` never called.

- **[Medium] Missing test: default-space color change does not emit `SpaceRenamedEvent`** — `UpdateSpaceUseCase.spec.ts:183-190`
  - What: Test confirms color change works but does not confirm no rename event is emitted.
  - Why it matters: R5.E1 behavior is partial; rename event on default space would be a bug.
  - Fix hint: Add `expect(eventEmitterService.emit).not.toHaveBeenCalledWith(expect.any(SpaceRenamedEvent))`.

- **[Medium] Missing controller test: `SpaceSlugConflictError` → 409 mapping** — `packages/spaces-management/src/nest-api/spaces-management/spaces-management.controller.spec.ts:310-394`
  - What: No case asserts the HTTP 409 for slug conflicts on PATCH.
  - Why it matters: TR4 boundary coverage missing at the HTTP layer.
  - Fix hint: Add a test asserting `ConflictException` when `service.updateSpace` rejects with `SpaceSlugConflictError`.

#### Low

- **[Low] `UpdateSpaceUseCase` casts `command.color as string` on throw** — `UpdateSpaceUseCase.ts:73`
  - What: Noisy cast; `command.color` is already typed.
  - Fix hint: Use `String(command.color)` or narrow the guard.

- **[Low] `SpaceService.updateSpace` mixes identity (name/color) and visibility (type) updates** — `packages/spaces/src/application/services/SpaceService.ts:157-194`
  - What: One method handles two concerns.
  - Fix hint: Split into `renameSpace`, `recolorSpace`, `changeSpaceVisibility` (tied to the REST split above).

- **[Low] Migration uses `logger.debug`** — `packages/migrations/src/migrations/1773417489327-AddIsDefaultSpaceToSpaces.ts:15,39`
  - What: Two `logger.debug` lines for schema steps.
  - Fix hint: Drop or convert to `info`.

- **[Low] `SpacesManagementGatewayApi.updateSpace` still exposes `type`** — `apps/frontend/src/domain/spaces-management/api/gateways/SpacesManagementGatewayApi.ts:94`
  - What: Identity UI only uses name+color; `type` is carried in the gateway signature.
  - Fix hint: Split gateway methods per action, or leave as is if visibility management shares the same UI path.

- **[Low] Gateway interface does not use `Gateway<IUseCase>` helper** — `apps/frontend/src/domain/spaces-management/api/gateways/ISpacesManagementGateway.ts`
  - What: Hand-rolled interface instead of the typed helper.
  - Why it matters: Frontend Data Flow standard recommends `Gateway<IUseCase>`.
  - Fix hint: Refactor to the helper so command/response types stay aligned with backend contracts.

- **[Low] `ISpacesManagementPort.updateSpace` JSDoc omits color** — `packages/types/src/spaces-management/ports/ISpacesManagementPort.ts:74`
  - What: Documentation says `(name, type)` — stale after color was added.
  - Fix hint: Update to `(name, type, color)`.

---

_Static analysis only. No code was executed during this review._
