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

### `spaces-management`
- Use cases composing across spaces + standards + recipes + skills.
- New use case: `ListOrganizationSpacesForManagementUseCase` (admin-only, paginated). Throws `InvalidPageError` (page < 1 or non-integer) and `OrganizationAdminRequiredError`.
- Constants: `ORGA_SPACE_MANAGEMENT_PAGE_SIZE = 8` (in `packages/types/src/spaces-management/contracts/IListOrganizationSpacesForManagementUseCase.ts`).

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
- **Gap:** create/delete mutations only invalidate the singular family. Callers using the plural family must invalidate manually after these mutations.

### Components and conventions
- `SpacesPagination.tsx` — controlled component `{ page, pageSize, totalCount, onPageChange }`. Returns `null` when `totalCount <= pageSize`. Buttons use `aria-label="Previous page"` / `aria-label="Next page"`.
- `CreateSpaceDialog.tsx` — accepts optional `onCreated` prop. When provided, the dialog skips its own close + navigate; the caller fully owns post-success behavior.
- Tests rendering `PMTable` need a Jest mock — see `.claude/docs/patterns/frontend/pmtable-jest-mock.md`.

## Cross-cutting patterns
- Per-domain artifact count aggregation across spaces — see `.claude/docs/patterns/backend/per-domain-count-aggregation.md`.
- `softDeleteSchemas` does not propagate `deleted_at IS NULL` across raw `innerJoin` calls on non-mapped tables. Add the predicate explicitly.
- Use cases create their own `PackmindLogger`; adapters never pass `this.logger` into a use case constructor.
