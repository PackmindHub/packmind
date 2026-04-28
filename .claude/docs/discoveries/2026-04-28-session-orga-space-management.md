# Session: orga-space-management implementation

**Date:** 2026-04-28
**Found while:** executing `.claude/plans/2026-04-27-orga-space-management.md` (paginated org-admin spaces listing + delete confirmation flow)

## What shipped

A paginated, admin-only spaces management listing was added end-to-end: a new use case, repository methods across four domains (spaces, standards, recipes, skills), a NestJS controller endpoint, a frontend gateway/query, a refactored pagination component, and a delete confirmation dialog wired to the existing mutation.

### Backend (12 commits)
- `f60329736` — Use case contract: `IListOrganizationSpacesForManagementUseCase` at `packages/types/src/spaces-management/contracts/IListOrganizationSpacesForManagementUseCase.ts`. Exports `SpaceManagementListItem`, `SpaceManagementListItemAdmin`, `ORGA_SPACE_MANAGEMENT_PAGE_SIZE = 8`.
- `66ec1ccfd` — `InvalidPageError` at `packages/spaces-management/src/domain/errors/InvalidPageError.ts`.
- `40fd52b56` — TypeORM migration: standalone `space_id` index on `user_space_memberships` (composite PK had `user_id` first, breaking aggregation queries).
- `a06bd7a44` — `findOrgPagePaginated(orgId, page, pageSize)` on `ISpacesPort` + `SpaceRepository`. Order: `isDefaultSpace DESC, createdAt ASC`.
- `89e6a348a` — `findAdminsForSpaceIds` + `countByRoleForSpaceIds(spaceIds, role: UserSpaceRole)` on `ISpacesPort` + `UserSpaceMembershipRepository`. Uses raw `innerJoin('users')` with explicit `u.deleted_at IS NULL`; falls back to `email.split('@')[0]` when `display_name` is null.
- `b7a43d79b` — Standards `countBySpaceIds` (port + IStandardRepository + repo + service + adapter).
- `5f5ae7151` — **Recipes `countBySpaceIds` — CANONICAL REFERENCE for the per-domain count pattern.** Future similar aggregations should copy this commit's diff.
- `7b4534508` — Skills `countBySpaceIds` (note: `packages/skills/src/application/adapter/` is singular, not plural).
- `ad46234a1` — `ListOrganizationSpacesForManagementUseCase` extending `AbstractAdminUseCase`. Validates page is a positive integer (else `InvalidPageError`), fans out to all four domains via `Promise.all`, stitches results.
- `12327f5e2` — Adapter method on `SpacesManagementAdapter` extending `ISpacesManagementPort`.
- `02e95c616` — Service pass-through with `logger.info`.
- `f4b870a29` — `GET /organizations/:orgId/spaces-management/listing?page=N` controller. Maps `InvalidPageError → BadRequestException`, `OrganizationAdminRequiredError → ForbiddenException`. Defaults `page` to 1.

### Frontend (5+ commits)
- `df7553031` — `SpacesManagementPage/types.ts` + `toSpaceListItem.ts` mapper. Cast required because `Space` lacks `createdAt`. Test uses real id factories.
- `175ee5a88` — Gateway + query options at `apps/frontend/src/domain/spaces/api/`. Query key: `['organizations', orgId, 'spaces', 'management', page]`. Uses `keepPreviousData` + `staleTime: 30_000`.
- `6da45d24c` — `SpacesPagination.tsx` refactored to controlled component. Returns `null` when `totalCount <= pageSize`. `<PMHStack as="nav" aria-label="Spaces pagination">`. Buttons: `aria-label="Previous page"` / `aria-label="Next page"`.
- `aa024d95d` — `SpacesManagementPage.tsx` rewired to the new query, removed all selection state.
- `3080a963d` — `SpacesTable.tsx` selection props removed; `SpacesBulkActionBar.tsx` deleted via `git rm`.
- `ba68c2b92` — Route `org.$orgSlug._protected.settings.spaces._index.tsx` swapped to `getOrganizationSpacesForManagementQueryOptions(orgId, 1)`. Subtitle pluralization: `null → bare`, `1 → "1 space"`, else `"N spaces"`.
- `b6f94869c` — `DeleteSpaceConfirmDialog.tsx` (new) + `SpaceRowActions.tsx` rewired. Reuses existing `useDeleteSpaceMutation` (`apps/frontend/src/domain/spaces-management/api/queries/SpacesManagementQueries.ts:229`); orgId comes from `useAuthContext` internally. The dialog's `onSuccess` invalidates the management key explicitly. View navigates via `routes.space.toDashboard(orgSlug, spaceSlug)`.
- `66a8d5d5e` — `SpacesToolbar.tsx` wires `onCreated` → invalidate the management key. **`CreateSpaceDialog` got a new optional `onCreated` prop** — when provided, the dialog skips its own close + navigate so the parent fully owns post-success behavior.

## Patterns and discoveries to keep

### 1. Per-domain `countBySpaceIds` aggregation pattern
Aggregating artifact counts across multiple domain tables uses one `Map<SpaceId, number>`-returning method per domain, fanned out via `Promise.all` in the use case. The canonical example is commit `5f5ae7151` (recipes): port + IRepository interface + repository implementation + service pass-through + adapter wiring. Future cross-domain aggregations should copy this exact shape. See pattern doc: `.claude/docs/patterns/backend/per-domain-count-aggregation.md`.

### 2. Soft-delete handling for raw joins
`softDeleteSchemas` auto-applies `deleted_at IS NULL` on `createQueryBuilder()` for the primary entity, but **does not propagate across raw `innerJoin` calls on non-mapped tables.** Keep an explicit `<alias>.deleted_at IS NULL` inside the join condition. See `findAdminsForSpaceIds` in commit `89e6a348a`.

### 3. `UserSpaceRole` enum vs string literals
Repository methods that take a role parameter use the `UserSpaceRole` enum (`UserSpaceRole.ADMIN`, `UserSpaceRole.MEMBER`) — never raw `'admin'` / `'member'` strings. Plan/spec snippets that show string literals are wrong; check the actual port signature.

### 4. Use cases never receive a logger from adapters
Adapter methods that instantiate use cases must NOT pass `this.logger` — use cases create their own `PackmindLogger` for proper origin tracking. (Per `back-end-typescript-clean-code-practices`.)

### 5. NestJS controller test style in `spaces-management`
The existing `spaces-management.controller.spec.ts` is unit-style (direct controller method calls + assert on rejections), NOT supertest-style. Match this when adding new endpoints to this package — don't introduce a Nest test module if siblings don't use one.

### 6. PMTable Jest mock requirement
Components rendering `PMTable` inside Jest tests need PMTable mocked to a plain `<table>` shim. `React.useState` resolves to undefined in PMTable's cjs build path under jest-swc. Recurring across `SpacesManagementPage.test.tsx`, `SpacesTable.test.tsx`. See pattern doc: `.claude/docs/patterns/frontend/pmtable-jest-mock.md`.

### 7. TanStack Query key invalidation gap on CreateSpace/DeleteSpace mutations
The shared mutations invalidate `spacesQueryKeys.all = ['organization', 'spaces']` (singular). The new management query uses `['organizations', orgId, 'spaces', 'management', page]` (plural). Callers using the management query must invalidate it manually after these mutations. Candidate for centralizing in the mutation's `onSuccess` if more callers adopt the plural key.

### 8. `CreateSpaceDialog.onCreated` callback contract
When `onCreated` is provided, the dialog returns early — caller owns close + navigation. When absent, default behavior (close + redirect-or-not based on `redirectAfterCreate`) applies. Pattern useful for any "stay on page after creation" flow.

## Domains and routes touched
- New domain capability: `spaces-management` got a paginated org-admin listing endpoint and a delete confirmation flow.
- New backend route: `GET /organizations/:orgId/spaces-management/listing?page=N`.
- Modified frontend route: `org.$orgSlug._protected.settings.spaces._index.tsx`.
- New use case: `ListOrganizationSpacesForManagementUseCase` (admin-only).
- New port methods: `findOrgPagePaginated`, `findAdminsForSpaceIds`, `countByRoleForSpaceIds` on `ISpacesPort`; `countBySpaceIds` on `IStandardsPort`, `IRecipesPort`, `ISkillsPort`.

## Why it matters
- The cross-domain count aggregation pattern is now reusable for any "list spaces with stats" or "list orgs with stats" feature.
- The PMTable Jest mock requirement and the soft-delete-on-raw-join trap are recurring issues — having them documented prevents future agents from rediscovering.
- The plural-vs-singular query key gap is a known invalidation bug surface; future callers must invalidate explicitly until centralized.

## Where it applies
- Backend: any future paginated listing that needs per-domain artifact counts.
- Frontend: any test rendering `PMTable`; any feature using the `['organizations', ...]` (plural) query key family.
- Cross-cutting: any repository method joining `users` or other soft-deletable tables via raw alias.

## Deferred
- E2E tasks 21–22 from the plan (Playwright create + delete specs). Need Docker stack + seeded data — not run in this session.
- Manual smoke checklist from the plan.

## Reference
- Plan: `.claude/plans/2026-04-27-orga-space-management.md` (intentionally not duplicated here).
- Canonical reference commit for per-domain count: `5f5ae7151`.

## Notes on pattern-doc decisions
- **Folded into this doc (not separate pattern files):** items 2 (soft-delete on raw joins), 3 (`UserSpaceRole` enum), 4 (no logger from adapter), 5 (controller test style), 7 (query-key invalidation gap), 8 (`onCreated` callback contract). Reasoning: items 2/3/4 are codebase-wide rules already covered (or covered enough) by existing back-end clean-code standards; items 5/7/8 are local conventions tied to one or two files and don't generalize broadly enough yet to warrant a top-level pattern.
- **Promoted to standalone pattern docs:** items 1 (per-domain count aggregation) and 6 (PMTable Jest mock). Both are reusable, copy-paste-shaped templates that future agents will want to find by name.
