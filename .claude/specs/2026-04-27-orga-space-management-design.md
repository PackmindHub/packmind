# Organization Spaces Management Page — Design Spec

**Goal:** Wire `/org/{orgSlug}/settings/spaces` to a dedicated, paginated, org-admin-only listing endpoint with aggregated admins, member counts, and artifact counts; remove bulk-delete UI; add a delete confirmation flow; keep `+ New space` on-page.

**Scope:** In — new backend use case + endpoint + repositories aggregations; route + query refactor; row actions (View, Delete) with confirmation; cleanup of bulk-action UI. Out — search/filter behavior, Edit row action, bulk delete, color persistence, page-size customization, navigation entry-point work.

## Source

EM spec: `specs/orga-space-management.md`

## Prior Knowledge

No `.claude/docs/` knowledge base exists in this project. Authoritative inputs consulted during brainstorming:
- `apps/CLAUDE.md` and `apps/frontend/CLAUDE.md` — app boundaries and conventions.
- `apps/frontend/.claude/rules/packmind/standard-frontend-data-flow.md` — clientLoader + queryClient + query options/hooks pattern.
- `.claude/rules/packmind/standard-typescript-good-practices.md` — intersection types for DTO enrichment, no `Object.setPrototypeOf` in errors.
- `.claude/rules/packmind/standard-compliance-logging-personal-information.md` — never log PII (e.g. emails) in clear text.
- Existing route: `apps/frontend/app/routes/org.$orgSlug._protected.settings.spaces._index.tsx` (already gated by `ORGA_SPACE_MANAGEMENT_FEATURE_KEY`).
- Existing partial page: `apps/frontend/src/domain/spaces/components/SpacesManagementPage/` (table, mappers, types, toolbar, pagination, bulk-action bar — bulk-action bar is removed by this design).
- Existing CreateSpaceDialog: `apps/frontend/src/domain/spaces-management/components/CreateSpaceDialog.tsx` (already supports `redirectAfterCreate={false}`).
- Existing backend domain packages: `packages/spaces` (entities, memberships, schemas) and `packages/spaces-management` (use cases incl. `ListUserSpacesUseCase`, `DeleteSpaceUseCase`; errors incl. `CannotDeleteDefaultSpaceError`, `SpaceDeletionForbiddenError`).
- Related design specs (cross-checked for sort/listing decisions):
  - `.claude/specs/2026-04-13-spaces-alphabetical-sort-design.md`
  - `.claude/specs/2026-04-08-admin-browse-join-all-spaces-design.md`
  - `.claude/specs/2026-04-07-space-creation-discoverability-design.md`

## Architecture

A new dedicated endpoint serves the management page. The existing `GET /organizations/:orgId/spaces` endpoint (user-spaces query) is left untouched and continues to power the sidebar, pickers, and other consumers.

**Backend:**
- Use case `ListOrganizationSpacesForManagementUseCase` in `packages/spaces-management/src/application/usecases/`.
- Endpoint `GET /organizations/:orgId/spaces/management?page=N` on the existing `OrganizationsSpacesController` (same controller, distinct path).
- Authorization: org admin only. The use case calls the existing org-admin assertion (pattern already used in the codebase — implementer uses the same approach as comparable admin-only use cases).
- Aggregation: a single `findAndCount` for the page of `Space`s, then five parallel queries via `Promise.all` against memberships (admins + member counts) and artifacts (standards / recipes / skills counts). Results are stitched in the use case. No N+1.
- Verify (and add if missing) `space_id` indexes on `user_space_memberships`, `standards`, `recipes`, `skills`.

**Frontend:**
- New gateway method on `SpacesGatewayApi`, typed via `Gateway<IListOrganizationSpacesForManagementUseCase>`.
- New query options + hook under `apps/frontend/src/domain/spaces/api/queries/SpacesQueries.ts` with `keepPreviousData` for smooth page transitions and a 30s stale time.
- Route `clientLoader` prefetches page 1 of the new query and exposes `totalCount` to the route component for the subtitle.
- `SpacesManagementPage.tsx` reads via `useGetOrganizationSpacesForManagementQuery(orgId, page)` with local `useState<number>` for the current page. Pagination becomes server-side.
- `SpacesBulkActionBar.tsx` is deleted; row checkboxes and selection state are removed from the table and page.
- New `DeleteSpaceConfirmDialog.tsx` invoked from `SpaceRowActions`. View action navigates to `/org/{orgSlug}/spaces/{slug}` when slug is present.
- `+ New space` opens the existing `CreateSpaceDialog` with `redirectAfterCreate={false}`; success handler closes the dialog and invalidates the new query.

## Data Model

### Use case contract (shared backend ↔ frontend gateway)

```ts
// packages/spaces-management/src/domain/usecases/IListOrganizationSpacesForManagementUseCase.ts
export type SpaceManagementListItem = Space & {
  admins: Array<{ id: UserId; displayName: string }>;
  membersCount: number;     // role = MEMBER (admins excluded)
  artifactsCount: number;   // sum of standards + recipes + skills
};

export type ListOrganizationSpacesForManagementCommand = {
  organizationId: OrganizationId;
  userId: UserId;           // for org-admin authz
  page: number;             // 1-based
};

export type ListOrganizationSpacesForManagementResponse = {
  items: SpaceManagementListItem[];
  totalCount: number;
  page: number;
  pageSize: number;         // const 8
};

export interface IListOrganizationSpacesForManagementUseCase {
  execute(
    cmd: ListOrganizationSpacesForManagementCommand,
  ): Promise<ListOrganizationSpacesForManagementResponse>;
}
```

`SpaceManagementListItem` extends `Space` per the TypeScript standard (intersection over re-declaration). `displayName` is sourced from the existing User entity field used elsewhere — no new column.

### New repository methods

| Repo | Method | Signature |
|---|---|---|
| `SpaceRepository` | `findOrgPagePaginated` | `(orgId, page, pageSize) → { items: Space[]; totalCount: number }` ordered `isDefaultSpace DESC, createdAt ASC` |
| `UserSpaceMembershipRepository` | `findAdminsForSpaceIds` | `(spaceIds) → Array<{ spaceId; user: { id; displayName } }>` joined with User |
| `UserSpaceMembershipRepository` | `countByRoleForSpaceIds` | `(spaceIds, role) → Map<SpaceId, number>` |
| `StandardRepository` | `countBySpaceIds` | `(spaceIds) → Map<SpaceId, number>` |
| `RecipeRepository` | `countBySpaceIds` | `(spaceIds) → Map<SpaceId, number>` |
| `SkillRepository` | `countBySpaceIds` | `(spaceIds) → Map<SpaceId, number>` |

Count methods return `Map<SpaceId, number>` so the use case can do O(1) lookups; missing entries default to `0` at the use case layer.

### Frontend type cleanup

```ts
// apps/frontend/src/domain/spaces/components/SpacesManagementPage/types.ts
export type SpaceListItem = Space & {
  colorToken: SpaceColorToken;
  isOrgWide: boolean;
  admins: SpaceAdminAvatar[];
  membersCount: number;     // was number | null
  artifactsCount: number;   // was number | null
  createdAt: string;        // was string | null
};
```

The `null` placeholders are removed because the new endpoint always populates these fields and the page no longer renders mocked rows.

The mapper `toSpaceListItem` now takes a `SpaceManagementListItem` (not a raw `Space`); existing usage is local to `SpacesManagementPage/`.

## Use Cases / Services

### `ListOrganizationSpacesForManagementUseCase.execute(cmd)`

Steps:
1. Validate `page` is a positive integer; otherwise throw `InvalidPageError(page)` (new error in `packages/spaces-management/src/domain/errors/`, follows the existing error pattern — no `Object.setPrototypeOf`).
2. Assert the caller is an org admin of `organizationId`. If not, the existing org-admin assertion error is thrown unchanged.
3. Fetch the page: `spaceRepository.findOrgPagePaginated(orgId, page, PAGE_SIZE)`.
4. If `items.length === 0`, return `{ items: [], totalCount, page, pageSize }`.
5. Otherwise, run 5 aggregations in parallel:
   - `userSpaceMembershipRepository.findAdminsForSpaceIds(spaceIds)`
   - `userSpaceMembershipRepository.countByRoleForSpaceIds(spaceIds, MEMBER)`
   - `standardRepository.countBySpaceIds(spaceIds)`
   - `recipeRepository.countBySpaceIds(spaceIds)`
   - `skillRepository.countBySpaceIds(spaceIds)`
6. Stitch each space row: attach admins (defaulting to `[]`), `membersCount` (defaulting to `0`), `artifactsCount = standards + recipes + skills` (defaulting each to `0`).
7. Return `{ items, totalCount, page, pageSize: PAGE_SIZE }`.

### Constants

`PAGE_SIZE = 8` is exported from a shared module reachable by both the use case and the frontend (so the gateway/query layer doesn't hardcode `8` independently).

### Errors

| Condition | Error | HTTP |
|---|---|---|
| `page` invalid | `InvalidPageError(page)` | 400 |
| Caller not org admin | reuse existing org-admin error | 403 |
| Org not found (defensive) | reuse existing pattern | 404 |

Out-of-range pages (`page > ceil(totalCount / pageSize)`): return empty `items` with the actual `totalCount`. Not an error.

### Logging

INFO log on success with `organizationId`, `page`, `itemsCount`, `totalCount`. No PII. The org-admin assertion handles its own forbidden logging per existing pattern.

### Adapters

Wire `ListOrganizationSpacesForManagementUseCase` into `SpacesManagementHexa` constructor following the existing adapter pattern (`ListUserSpacesUseCase` is the closest sibling to copy from).

## API / CLI / Frontend Surface

### Backend

- Route: `GET /organizations/:orgId/spaces/management?page=N`.
- Controller: `OrganizationsSpacesController` (existing). New method calls `SpacesManagementHexa.useCases.listOrganizationSpacesForManagement.execute(...)` and returns the response shape verbatim.
- Auth guard: existing JWT/session guard — same as the sibling `listSpaces` action. The use case enforces org-admin separately.

### Frontend gateway and query

```ts
// apps/frontend/src/domain/spaces/api/gateways/SpacesGatewayApi.ts
listOrganizationSpacesForManagement: Gateway<IListOrganizationSpacesForManagementUseCase>;
// implemented as: GET /organizations/:orgId/spaces/management?page=N
```

```ts
// apps/frontend/src/domain/spaces/api/queries/SpacesQueries.ts
export function getOrganizationSpacesForManagementQueryOptions(orgId: string, page: number) {
  return queryOptions({
    queryKey: ['organizations', orgId, 'spaces', 'management', page],
    queryFn: () => spacesGateway.listOrganizationSpacesForManagement(orgId, page),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useGetOrganizationSpacesForManagementQuery(orgId: string, page: number) {
  return useQuery(getOrganizationSpacesForManagementQueryOptions(orgId, page));
}
```

### Route refactor

`apps/frontend/app/routes/org.$orgSlug._protected.settings.spaces._index.tsx`:
- `clientLoader` calls `queryClient.ensureQueryData(getOrganizationSpacesForManagementQueryOptions(orgId, 1))` and returns `{ totalCount }`.
- The route component uses `totalCount` (replacing `spaceCount`) for the subtitle. Null-fallback wording is preserved.

### Page changes

`SpacesManagementPage.tsx`:
- Remove `selectedRows` state and any selection callbacks.
- Add `const [page, setPage] = useState(1);` and call `useGetOrganizationSpacesForManagementQuery(orgId, page)`.
- Map `data.items.map(toSpaceListItem)` into `<SpacesTable>`.
- Pass `page`, `setPage`, `totalCount`, `pageSize` to `<SpacesPagination>`.
- Loading and error states preserved (existing behavior).

`SpacesTable.tsx`:
- Drop checkbox column and the related props.
- Drop `<SpacesBulkActionBar>` import (file deleted).
- Columns kept: Name, Admins, Members, Artifacts, Created, Actions.

`SpacesPagination.tsx`:
- Refactor to a controlled component: props `{ page, pageSize, totalCount, onPageChange }`. `totalPages = Math.ceil(totalCount / pageSize)`. Hide entirely when `totalCount <= pageSize`.

`SpaceRowActions.tsx`:
- Items: **View** (hidden if no `slug`), **Delete** (hidden if `isDefaultSpace`). Edit hidden.
- View navigates with `useNavigate()` to `/org/{orgSlug}/spaces/{slug}`.
- Delete opens `<DeleteSpaceConfirmDialog>`.

`DeleteSpaceConfirmDialog.tsx` (new, under `SpacesManagementPage/`):
- Modal copy: `Delete space '{name}'? This action is irreversible.` Buttons: `Cancel` / `Delete`.
- Wires existing `useDeleteSpaceMutation`.
- Success: close, success toast, invalidate `['organizations', orgId, 'spaces', 'management']` (broad key invalidates all cached pages so the table refreshes).
- Error: error toast, modal stays open. Microcopy reviewed via `ux-microcopy`.

`SpacesToolbar.tsx`:
- Search and Admin/Member dropdowns: visual-only (no behavior wired).
- `+ New space` opens the existing `<CreateSpaceDialog redirectAfterCreate={false} onCreated={…}>`.
- The `onCreated` handler closes the dialog and invalidates the new query.

`CreateSpaceDialog.tsx` (existing): no contract change beyond confirming/wiring the `onCreated` callback if not already exposed; the dialog itself already supports staying on the page after create.

### Files deleted

- `apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesBulkActionBar.tsx`
- Any colocated test for it.

## Testing Approach

### Backend

| Layer | Coverage |
|---|---|
| `ListOrganizationSpacesForManagementUseCase.spec.ts` | Authz pass/fail; `page < 1` throws `InvalidPageError`; out-of-range page returns `{items: [], totalCount}`; happy path returns 8 rows ordered with default-space-first; aggregation defaults missing entries to `0`; stitching maps each row's counts to the correct space. |
| `SpaceRepository.findOrgPagePaginated` | Sort order with mixed default + non-default spaces; `totalCount` accuracy; page 2 offset. |
| `UserSpaceMembershipRepository.findAdminsForSpaceIds` | Returns ADMIN rows only; joins User; multi-spaceId input. |
| `UserSpaceMembershipRepository.countByRoleForSpaceIds` | Counts per role; honors any soft-delete on memberships. |
| `Standard / Recipe / Skill Repository.countBySpaceIds` | Returns `Map<SpaceId, number>`; spaces with zero items absent from map. |
| `OrganizationsSpacesController` (controller test) | New route returns 200 and shape; 403 for non-admin; 400 for invalid page. |

Real-DB integration tests follow `repository-implementation-and-testing-pattern` (factories, no mocks).

### Frontend

| File | Coverage |
|---|---|
| `toSpaceListItem.test.ts` (update) | Mapper takes `SpaceManagementListItem`, output has correct `colorToken`, `isOrgWide`, and pre-aggregated counts. |
| `SpacesManagementPage.test.tsx` (update) | Renders rows from new query (mocked); pagination triggers re-fetch with new page; bulk-action UI absent; loading/error preserved. |
| `DeleteSpaceConfirmDialog.test.tsx` (new) | Renders with name; Cancel closes; Delete calls mutation, invalidates, fires success toast, closes; on error, toast + modal stays open. |
| `SpacesPagination.test.tsx` (new or update) | Hides when `totalCount <= pageSize`; calls `onPageChange` with right page; disables prev/next at boundaries. |
| `SpaceRowActions.test.tsx` (new or update) | Default space hides Delete; non-default shows it; View hidden when slug missing; View navigates. |

### E2E (Playwright)

- **Rule 3 Example 1**: navigate to `/org/{slug}/settings/spaces`, click `+ New space`, fill name + visibility, submit. Assert dialog closes, URL still `/settings/spaces`, new space visible in table.
- **Rule 4 Example 1**: open row actions on a non-default space, click Delete, confirm. Assert modal closes, success toast, row removed.

E2E follows the existing Page Object Model pattern under `apps/e2e-tests/`.

### Index verification

Plan includes a step to grep migrations for `space_id` index creation on `user_space_memberships`, `standards`, `recipes`, `skills`. If any are missing, add a TypeORM migration following `typeorm-migrations` standard with proper `down()`.

## Out of Scope

- Functional Search input (visual-only).
- Functional Admin/Member filter dropdowns (visual-only).
- Row `Edit` action (hidden).
- Bulk-delete UI (removed; no toggle).
- Persisted space color (derived deterministically from `space.id`).
- Page-size customization (fixed 8).
- Sidebar/navigation entry-point to `/settings/spaces`.
- Folder reorganization of `apps/frontend/src/domain/spaces-management/`.
- User Events / analytics (none defined for this iteration).
