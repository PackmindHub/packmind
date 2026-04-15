# Manage Space Identity — Design Spec

**Goal:** Let space admins and organization admins update a space's display name and color, with slug stability, slug-collision guards, and server-side color persistence so all org members see the same chosen color.

**Scope:**
- In: backend domain changes (`Space.color`, slug-stable rename, slug-collision guard), `UpdateSpaceUseCase` authorization rework, new events/errors, PATCH endpoint extension, frontend wiring of the existing `SpaceIdentitySection`, sidebar color consumption, migration backfilling color for existing spaces.
- Out: `SPACE_IDENTITY_FEATURE_KEY` lifecycle (kept gated), restyling of the identity form, changes to `SpaceVisibilityUpdatedEvent` or visibility semantics, adding events for color changes.

## Source

- EM spec: `em-specs/manage-space-identity.md`

## Architecture

Touches four domain boundaries and two apps:

- `packages/types` — new `SpaceColor` type and `SpaceRenamedEvent`; `Space` gains a `color` field.
- `packages/spaces` — `SpaceSchema` gains a `color` column; `SpaceService.updateSpace` stops mutating the slug and gains a slug-collision check against a slugified *new name*.
- `packages/spaces-management` — `UpdateSpaceUseCase` swaps its abstract base class to match the auth-tolerant pattern used by `DeleteSpaceUseCase` (org-admin OR space-admin). Three new domain errors, one new event emission on rename.
- `packages/migrations` — migration adds the `color` column nullable, backfills using the same deterministic hash the frontend uses today, then sets NOT NULL.
- `apps/api` — NestJS controller accepts `color` on the existing PATCH body; error → HTTP mappings extended.
- `apps/frontend` — `SpaceIdentitySection` wired to real data + mutation; `SpaceNavBlock` reads `space.color` instead of hashing the name; shared palette constant consolidated into `@packmind/types`.

## Authorization

Pattern mirrors `packages/spaces-management/src/application/usecases/DeleteSpaceUseCase.ts`:

```ts
// Inside executeForMembers
const isOrgAdmin = command.membership.role === 'admin';
if (!isOrgAdmin) {
  const spaceMembership = await this.spacesPort.findMembership(userId, spaceId);
  if (spaceMembership?.role !== UserSpaceRole.ADMIN) {
    throw new SpaceIdentityUpdateForbiddenError(userId, spaceId);
  }
}
```

`UpdateSpaceUseCase` switches its base class from `AbstractSpaceAdminUseCase` → `AbstractMemberUseCase`. The new auth check is a strict superset of today's (previously space-admin only) and so existing callers (visibility updates) remain authorized.

## Data Model

### `SpaceColor` (shared type)

New file `packages/types/src/spaces/SpaceColor.ts`:

```ts
export const SPACE_COLOR_PALETTES = [
  'red', 'orange', 'yellow', 'green',
  'teal', 'blue', 'cyan', 'purple', 'pink',
] as const;
export type SpaceColor = (typeof SPACE_COLOR_PALETTES)[number];
```

Exported via the spaces barrel (`packages/types/src/spaces/index.ts`).

### `Space` entity

`packages/types/src/spaces/Space.ts` — add `color: SpaceColor` (required, NOT NULL in DB).

### `SpaceSchema`

`packages/spaces/src/infra/schemas/SpaceSchema.ts` — add:

```ts
color: { type: 'varchar', length: 16, nullable: false }
```

No DB-level CHECK constraint; enum enforcement is at the use-case layer via `InvalidSpaceColorError`.

### Migration

New file under `packages/migrations/src/migrations/<timestamp>-AddSpaceColor.ts`:

1. `up`:
   - `ALTER TABLE space ADD COLUMN color VARCHAR(16) NULL`
   - `SELECT id, name FROM space` (soft-deleted rows included — rows are not deleted by column add)
   - For each row, compute the same deterministic hash used by `getSpaceColorPalette` today and update.
   - `ALTER TABLE space ALTER COLUMN color SET NOT NULL`.
2. `down`: drop column.

The migration duplicates the hash function inline (migrations are self-contained; they must not depend on code that may move or change later).

## Use Cases / Services

### `SpaceService.updateSpace` (`packages/spaces/src/application/services/SpaceService.ts:146-176`)

Reworked behavior:

- **Slug is no longer regenerated** when name changes. The stored slug stays stable.
- **Slug collision guard:** if `name` is updated, compute `slugify(newName)`. If any other space in the same org already owns that slug, throw `SpaceSlugConflictError`. (Same-space match — i.e., `newName` produces this space's own slug — is allowed.)
- **Color:** if provided, persisted via `updateFields({ color })`.
- **Name:** persisted as-is.

This covers EM Rule 2 (slug stability) and Rule 3 (collision guard when slugified new name clashes with an existing space's slug, as in "Security Connections" → "Security").

### `UpdateSpaceUseCase` (`packages/spaces-management/src/application/usecases/UpdateSpaceUseCase.ts`)

Rewritten around `AbstractMemberUseCase`:

1. Load space → `SpaceNotFoundError` if missing or wrong org.
2. Run org-admin OR space-admin gate → `SpaceIdentityUpdateForbiddenError` otherwise.
3. If `name` is present and changed, and `space.isDefaultSpace`, throw `CannotRenameDefaultSpaceError` (Rule 5).
4. If `color` is present, validate against `SPACE_COLOR_PALETTES` → `InvalidSpaceColorError` otherwise.
5. Call `SpaceService.updateSpace({ spaceId, name, type, color })`.
6. **Events:**
   - If `name` changed: emit new `SpaceRenamedEvent` with payload `{ userId, organizationId, source, spaceId, spaceSlug, oldName, newName }`.
   - If `type` changed: keep emitting `SpaceVisibilityUpdatedEvent` (unchanged).
   - Color changes: no event (per product decision).

### New event: `SpaceRenamedEvent`

`packages/types/src/spaces/events/SpaceRenamedEvent.ts`:

```ts
export interface SpaceRenamedEventPayload {
  userId: UserId;
  organizationId: OrganizationId;
  source: EventSource;
  spaceId: SpaceId;
  spaceSlug: string;
  oldName: string;
  newName: string;
}

export class SpaceRenamedEvent extends UserEvent<SpaceRenamedEventPayload> {
  static override readonly eventName = 'space.space.renamed';
}
```

Added to `packages/types/src/spaces/events/index.ts`.

### New domain errors

Under `packages/spaces-management/src/domain/errors/`:

- `CannotRenameDefaultSpaceError` — "Default space cannot be renamed."
- `SpaceIdentityUpdateForbiddenError` — "User {id} cannot update identity of space {id}."
- `InvalidSpaceColorError` — "Color '{value}' is not a valid space color."

## API / CLI / Frontend Surface

### API controller

`packages/spaces-management/src/nest-api/spaces-management/spaces-management.controller.ts:255-286`:

Extend the PATCH body DTO:

```ts
{ name?: string; type?: SpaceType; color?: SpaceColor }
```

Error → HTTP mapping additions:

- `CannotRenameDefaultSpaceError` → **422**
- `SpaceIdentityUpdateForbiddenError` → **403**
- `SpaceSlugConflictError` → **409** (already emitted by create; reuse mapping if present, otherwise add)
- `InvalidSpaceColorError` → **400**

### Frontend gateway

`apps/frontend/src/domain/spaces-management/api/gateways/ISpacesManagementGateway.ts` — extend:

```ts
updateSpace(
  orgId: string,
  spaceId: string,
  fields: { name?: string; type?: SpaceType; color?: SpaceColor },
): Promise<Space>;
```

Implementation passthrough in `SpacesManagementGatewayApi.updateSpace` — no change beyond typing.

### Frontend mutation hook

In the existing spaces-management queries module: add `useUpdateSpaceMutation(orgId, spaceId)`. On success invalidate:
- `getSpaceBySlugQueryOptions` for the space being edited.
- `getUserSpacesQueryOptions` for the org (sidebar re-renders with new color/name).

### `SpaceIdentitySection.tsx`

Full rewrite of the body:

- Takes `space: Space` and `canEdit: boolean` as props (passed by `SpaceGeneralSettings`, which already loads the space).
- Local form state seeded from `space.name` and `space.color`.
- When `!canEdit`, all inputs and the Save button are disabled (non-admin viewers see the form read-only).
- **Name input** additionally disabled when `space.isDefaultSpace`, with helper text "The default space cannot be renamed."
- **Inline slug warning** under the name field, visible whenever `slugify(form.name) !== space.slug`:
  > "The space URL will remain `/spaces/{slug}`, which no longer matches the name."
- Uses the same `slug` package as backend for consistency.
- **Save button** submits only changed fields via the mutation; disabled when nothing changed or while pending.
- Backend errors surfaced via toast:
  - 409 slug conflict → "Another space with a similar name already exists."
  - 422 default-space rename → "The default space cannot be renamed."
  - 400 invalid color → "Invalid color selected."
  - 403 forbidden → "You don't have permission to update this space."

### `SpaceGeneralSettings.tsx`

Per EM technical rule #1 ("the frontend keeps the form visible but disabled"), the identity section is now rendered for **any** viewer of the settings page, but editability is gated:

- Always render `<SpaceIdentitySection space={space} canEdit={canEditIdentity} />`.
- `canEditIdentity = isSpaceAdmin || isOrgAdmin` (matches Rule 1 Examples 1 + 2).
- When `!canEditIdentity`, `SpaceIdentitySection` disables all inputs and the Save button. This satisfies Rule 1 Example 3 (regular member sees the form in read-only state).

The backend continues to authoritatively reject any unauthorized call as defense-in-depth.

### `SpaceNavBlock.tsx`

Replace three call sites of `getSpaceColorPalette(space.name)` with `space.color`:
- Line 198 (`colorPalette={...}` on `PMStatus.Root` — active expanded block).
- Line 272 (`backgroundColor` on `PMAvatar.Root` — collapsed block).
- Line 365 (`colorPalette={...}` on `PMStatus.Root` — expanded name row).

Delete the local duplicate `SPACE_COLOR_PALETTES` and the now-unused `getSpaceColorPalette` helper (kept only inside the migration file).

### Shared palette

`SpaceIdentitySection.tsx` and `SpaceNavBlock.tsx` import `SPACE_COLOR_PALETTES` and `SpaceColor` from `@packmind/types` instead of redeclaring.

## Testing Approach

- **SpaceService:** unit tests for the reworked `updateSpace`:
  - Rename that slugifies to another space's slug → `SpaceSlugConflictError`.
  - Rename of own space (slugify new name === own slug) → allowed.
  - Rename persists the new name but keeps slug stable.
  - Color update persists.
- **UpdateSpaceUseCase:** unit tests covering the full auth matrix (org-admin allowed; space-admin allowed; regular member rejected; non-member rejected), default-space rename rejected, color validation, event emission only when name changed, visibility event still emitted when type changes.
- **Migration:** unit test asserting that the migration's hash function produces identical output to the current frontend `getSpaceColorPalette` for a battery of representative names. Guards against the user-visible color changing after deploy.
- **API controller:** spec covering the new `color` field and HTTP error mappings for the three new errors.
- **Frontend:**
  - `SpaceIdentitySection` component tests: name disabled when default, slug-warning visibility toggles, mutation called with only changed fields, error toasts for each mapped HTTP error.
  - Sidebar snapshot test verifying `space.color` drives the palette.
- **E2E (Playwright):**
  - Rule 1 Example 1 — space admin successfully updates name + color.
  - Rule 3 Example 1 — slug-collision rename rejected with an error message.
  - Rule 5 Example 1 — default-space color update succeeds.
  - (Remaining EM rules are covered by unit/component tests; Playwright covers the highest-risk end-to-end flows. If full E2E coverage of every `<!-- E2E -->` example is desired, we can extend this list.)

## Out of Scope

- `SPACE_IDENTITY_FEATURE_KEY` feature flag lifecycle — stays active, flipped by ops when ready.
- Restyling or layout changes to `SpaceIdentitySection`.
- Changes to visibility (`type`) update semantics.
- Events for color-only changes.
- Per-user color overrides (Rule 4 is satisfied by server-side persistence alone).
- Slug regeneration or manual slug editing.
