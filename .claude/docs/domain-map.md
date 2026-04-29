# Domain map

Running file. Update in place — never replace.

## Backend domains (`packages/`)

### `spaces`
- Owner of `Space`, `UserSpaceMembership`, `UserSpaceRole`.
- Port: `ISpacesPort` (`packages/types/src/spaces/ports/ISpacesPort.ts`).
- Notable port methods:
  - `findOrgPagePaginated(orgId, page, pageSize)` — order: `isDefaultSpace DESC, createdAt ASC`.
  - `findAdminsForSpaceIds(spaceIds)` — returns `Array<{ spaceId, user: { id, displayName } }>`. Display name falls back to `email.split('@')[0]`.
  - `countByRoleForSpaceIds(spaceIds, role: UserSpaceRole)` — returns `Map<SpaceId, number>`.
- Member-mutation use cases (`AddMembersToSpaceUseCase`, `RemoveMemberFromSpaceUseCase`, `UpdateMemberRoleUseCase`) implement the org-admin override — see `.claude/docs/patterns/backend/org-admin-override-on-space-admin-usecases.md`.

### `spaces-management`
- Use cases composing across spaces + standards + recipes + skills.
- New use case: `ListOrganizationSpacesForManagementUseCase` (admin-only, paginated). Throws `InvalidPageError` (page < 1 or non-integer) and `OrganizationAdminRequiredError`.
- Constants: `ORGA_SPACE_MANAGEMENT_PAGE_SIZE = 8` (in `packages/types/src/spaces-management/contracts/IListOrganizationSpacesForManagementUseCase.ts`).
- `UpdateSpaceUseCase` also implements the org-admin override pattern — same as the three space use cases above.

### `standards`, `recipes`, `skills`
- Each exposes `countBySpaceIds(spaceIds): Promise<Map<SpaceId, number>>` for cross-domain aggregation.
- Pattern doc: `.claude/docs/patterns/backend/per-domain-count-aggregation.md`.
- Note: `packages/skills/src/application/adapter/` is singular `adapter`, not plural.

## Backend HTTP routes (NestJS, in `apps/api/`)

| Method | Path | Use case | Notes |
|---|---|---|---|
| GET | `/organizations/:orgId/spaces-management/listing?page=N` | `ListOrganizationSpacesForManagementUseCase` | Org-admin only. `page` defaults to 1. `InvalidPageError → 400`, `OrganizationAdminRequiredError → 403`. |

Controller test style for `spaces-management` is unit-style (direct method calls + assert on rejections), not supertest.

## Frontend (`apps/frontend/`)

### Routes touched
- `org.$orgSlug._protected.settings.spaces._index.tsx` — paginated spaces management page. Uses `getOrganizationSpacesForManagementQueryOptions(orgId, page)`.

### Query keys
- Singular family (legacy): `['organization', 'spaces', ...]` — used by shared `useDeleteSpaceMutation` / `useCreateSpaceMutation` invalidations.
- Plural family (new management listing): `['organizations', orgId, 'spaces', 'management', page]`.
- **Gap:** create/delete mutations only invalidate the singular family. Callers using the plural family must invalidate manually after these mutations. As of 2026-04-29 there are 4+ manual-invalidation callers (`SpacesToolbar`, `DeleteSpaceConfirmDialog`, `SpaceIdentitySection`, `SpaceMembersList`); centralization into the shared mutations is the simplest next step.

### Components and conventions
- `SpacesPagination.tsx` — controlled component `{ page, pageSize, totalCount, onPageChange }`. Returns `null` when `totalCount <= pageSize`. Buttons use `aria-label="Previous page"` / `aria-label="Next page"`.
- `CreateSpaceDialog.tsx` — accepts optional `onCreated` prop. When provided, the dialog skips its own close + navigate; the caller fully owns post-success behavior.
- `SpaceManagementDrawer.tsx` (under `SpacesManagementPage/`) — 3-tab drawer (General / Members / Danger) over the management listing. Composes `SpaceIdentitySection`, `SpaceMembersList`, `SpaceDangerZoneSection`. Danger tab omitted when `space.isDefaultSpace`. Tab reset on space change via `useEffect` (not `key=`).
- `SpacesTable.tsx` — supports optional `onSelectSpace` via `RowClickArea` PMBox-div wrappers per non-actions cell with `target.closest('button, a, input, [role="menu"], [role="menuitem"]')` interactive guard. Workaround: PMTable has no `onRowClick`. If a second consumer needs row click, promote to a pattern doc and consider upstreaming `onRowClick` to PMTable.
- `SpaceMembersList.tsx`, `SpaceDangerZoneSection.tsx` — prop-driven (no `useCurrentSpace`). See `.claude/docs/patterns/frontend/prop-driven-space-sections.md`.
- Tests rendering `PMTable` need a Jest mock — see `.claude/docs/patterns/frontend/pmtable-jest-mock.md`.

## Cross-cutting patterns
- Per-domain artifact count aggregation across spaces — see `.claude/docs/patterns/backend/per-domain-count-aggregation.md`.
- Org-admin override on space-admin use cases — see `.claude/docs/patterns/backend/org-admin-override-on-space-admin-usecases.md`.
- Prop-driven per-space sections (composable across settings page + management drawer) — see `.claude/docs/patterns/frontend/prop-driven-space-sections.md`.
- `softDeleteSchemas` does not propagate `deleted_at IS NULL` across raw `innerJoin` calls on non-mapped tables. Add the predicate explicitly.
- Use cases create their own `PackmindLogger`; adapters never pass `this.logger` into a use case constructor.
