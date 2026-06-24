# Space Identity and Rights Management (Org Admin Drawer) — Design Spec

**Goal:** From `/org/:orgSlug/settings/spaces`, let an org admin click a space row to open a side drawer that manages the space's identity (name, color), members (add / remove / change role), and deletion — without leaving the listing.

**Scope:** In — drawer container with three tabs (General / Members / Danger); refactor of three existing section components to be prop-driven; backend authz extension so org admins can manage members of any space. Out — visibility/type editing in the drawer; deep-linking the drawer; replacing the existing per-space `/space/:slug/settings` page; toolbar search/filter behaviour; autosave; URL state for the drawer.

## Source

None (fresh idea, derived from `apps/playground/src/prototypes/spaces-management/` and the user's confirmation of the four design choices: drawer UX, org-admin authz extension, per-section save buttons, name+color only in General, hide Danger on default space, prop-refactor of existing sections).

## Prior Knowledge

- `.claude/specs/2026-04-27-orga-space-management-design.md` — design for the paginated org-admin spaces listing this drawer plugs into.
- `.claude/docs/discoveries/2026-04-28-session-orga-space-management.md` — implementation notes from the listing build:
  - PMTable Jest mock requirement (`.claude/docs/patterns/frontend/pmtable-jest-mock.md`)
  - `UserSpaceRole` enum (never raw `'admin'`/`'member'` strings) at the port boundary; the frontend `SpaceMemberRole` type uses `'admin' | 'member'` literals (separate concern)
  - Use cases create their own `PackmindLogger` — adapters never inject one
  - Plural query key gap: `['organizations', orgId, 'spaces', 'management']` must be invalidated explicitly after mutations that affect listing rows
  - `CreateSpaceDialog.onCreated` callback contract — same pattern reused here for the drawer's `onDeleted`
- `.claude/docs/domain-map.md` — `ISpacesPort` methods, `SpaceManagementListItem` shape, the listing's controller test style (unit-style, no supertest module).
- Backend authz pattern in `UpdateSpaceUseCase.executeForMembers`: short-circuits to `executeForSpaceAdmins` when `command.membership.role === 'admin'`. The three membership use cases (`AddMembersToSpaceUseCase`, `RemoveMemberFromSpaceUseCase`, `UpdateMemberRoleUseCase`) currently lack this override — we add it.
- Existing prop-ready components: `SpaceIdentitySection({ space, canEdit })` already takes data via props and uses `useUpdateSpaceMutation` internally.
- Existing data-coupled components to refactor: `SpaceMembersList` and `SpaceDangerZoneSection` both call `useCurrentSpace()`, which only works inside the `_space-protected` route. They become prop-driven so they can render in the drawer too.

## Architecture

The feature is a thin composition layer on top of existing use cases, mutations, and section components. No new endpoints, schemas, or migrations.

### Backend

The three space-membership use cases gain the same authz override that `UpdateSpaceUseCase` already has:

```ts
protected override async executeForMembers(
  command: <Command> & MemberContext,
): Promise<<Response>> {
  if (command.membership.role === 'admin') {  // org admin
    return this.executeForSpaceAdmins(command);
  }
  return super.executeForMembers(command);
}
```

The downstream `executeForSpaceAdmins` body is unchanged — every domain rule (cannot remove self, cannot remove from default space, cannot update own role, member-not-found) still applies. Org admins acting on a space they aren't in skip only the membership-lookup that would otherwise raise `SpaceAdminRequiredError`.

Side effects are unchanged: `SpaceMembersAddedEvent`, `SpaceMembersRemovedEvent`, `SpaceMembersRoleUpdatedEvent`, `SpaceRenamedEvent` continue to emit with `command.userId` (the org admin's id) as the actor.

The HTTP layer (`SpaceMembersController`, `SpacesManagementController`) needs no changes. `SpaceAdminRequiredError → 403` mapping stays — it just stops firing for org admins.

### Frontend

Three section components get a small prop refactor; one new container component composes them inside a drawer.

**Refactored components** (under `apps/frontend/src/domain/spaces/components/`):
- `SpaceMembersList.tsx` — accepts `{ space: Space, isSpaceAdmin: boolean }`. Drops `useCurrentSpace`. The "is admin?" computation lives in the parent so the drawer can OR with org-admin role. The existing `SpaceSettingsPage.tsx` adapts: it pulls `space` from `useCurrentSpace` and computes `isSpaceAdmin` locally before passing into `SpaceMembersList`.
- `SpaceDangerZoneSection.tsx` — accepts `{ space: Space, canDelete: boolean, onDeleted?: () => void }`. Drops `useCurrentSpace`. The optional `onDeleted` lets the drawer close + invalidate the listing on success. The existing caller `SpaceGeneralSettings` adapts: it pulls `space` from `useCurrentSpace` and passes it down (no `onDeleted` — default redirect behaviour preserved).
- `SpaceGeneralSettings.tsx` — minimal change: it stays where it is in the per-space page tree; it now reads `space` from `useCurrentSpace` and forwards it to `SpaceDangerZoneSection`. Its props are unchanged from outside callers.
- `SpaceSettingsPage.tsx` — minimal change: still uses `useCurrentSpace` + `useGetSpaceMembersQuery` + `useAuthContext` internally; now passes the derived `space` and `isSpaceAdmin` into `SpaceMembersList` directly.

**New components** (under `apps/frontend/src/domain/spaces/components/SpacesManagementPage/`):
- `SpaceManagementDrawer.tsx` — drawer container. Props: `{ space: SpaceManagementListItem | null; onClose: () => void }`. Internals:
  - `PMDrawer.Root open={!!space} placement="end" size="md"` (matches the playground's drawer)
  - Header row: status dot in `space.color` + name + subtitle "`createdAt` · N members · M artifacts"
  - `PMTabs` with values `general` / `members` / `danger`. Danger tab is omitted from the array entirely when `space.isDefaultSpace` is true.
  - Each tab renders the corresponding refactored section, with `space` and the derived flags passed as props.
  - The drawer fetches `useGetSpaceMembersQuery(space.id)` at its top level so the General tab and the Members tab share one cache entry. The current-user role lookup powering `isSpaceAdmin` is done here too.
- Modifications:
  - `SpacesTable.tsx` — adds an `onSelectSpace(space)` callback fired on row body click; clicks on the kebab menu/buttons are stopPropagated.
  - `SpacesManagementPage.tsx` — owns `[selectedSpace, setSelectedSpace] = useState<SpaceManagementListItem | null>(null)` and renders `<SpaceManagementDrawer space={selectedSpace} onClose={() => setSelectedSpace(null)} />` alongside the table.

### Authorization summary (post-change)

| Operation | Allowed roles |
|---|---|
| Read listing | org admin (unchanged) |
| Rename / change color | space admin OR org admin (already implemented) |
| Add / remove members | space admin OR **org admin** (this is the new permission) |
| Change member role | space admin OR **org admin** (this is the new permission) |
| Delete space | space admin OR org admin (already implemented; default space blocked) |

## Data Model

No backend schema changes. No migration. Both `Space` (id, name, slug, type, organizationId, isDefaultSpace, color) and `UserSpaceMembership` (userId, spaceId, role, pinned, createdBy, updatedBy) carry every field this feature reads or writes.

No new contracts. The four use-case contracts already exist in `packages/types/src/spaces/contracts/`:
- `IUpdateSpaceUseCase` (rename + color + type)
- `IAddMembersToSpaceUseCase`
- `IRemoveMemberFromSpaceUseCase`
- `IUpdateMemberRoleUseCase`
- `IListSpaceMembersUseCase`

### Frontend types

`SpaceManagementListItem` (already in `IListOrganizationSpacesForManagementUseCase`) is the input type for the drawer. It carries everything the drawer header needs (`id`, `name`, `slug`, `color`, `isDefaultSpace`, `admins[]`, `membersCount`, `artifactsCount`, `createdAt`) without requiring a second fetch.

The refactored section components take `Space` (the entity), not `SpaceManagementListItem`. Conversion is trivial because `SpaceManagementListItem extends Space` (per the existing listing design); the drawer passes the same object.

### Authorization derivation in the drawer

```ts
const { data: membersData } = useGetSpaceMembersQuery(space.id);
const { user, organization } = useAuthContext();
const currentUserMember = membersData?.members?.find((m) => m.userId === user?.id);
const isSpaceAdmin = currentUserMember?.role === 'admin';
const isOrgAdmin = organization?.role === 'admin';
const canEdit = isSpaceAdmin || isOrgAdmin;
const canDelete = isSpaceAdmin || isOrgAdmin;
```

These flow into the section components as `canEdit` / `canDelete` / `isSpaceAdmin`.

### Query keys impacted

| Key | Invalidated on |
|---|---|
| `['organizations', orgId, 'spaces', 'management']` (listing) | identity update, member add/remove/role-change, delete |
| `spacesQueryKeys.members(orgId, spaceId)` | member add/remove/role-change (already wired in existing mutations) |
| `spacesQueryKeys.list(orgId)` (sidebar list) | rename, color change (already wired in existing mutations) |

The listing-key invalidation is added explicitly inside the drawer's `onSuccess` handlers — matching the pattern already used by `DeleteSpaceConfirmDialog` and flagged in the discoveries doc as the current convention (until centralised).

## Use Cases / Services

### Backend (3 use cases — same one-line override each)

`AddMembersToSpaceUseCase`, `RemoveMemberFromSpaceUseCase`, `UpdateMemberRoleUseCase`: add `executeForMembers` override that short-circuits when the caller is an org admin. The pattern is copied verbatim from `UpdateSpaceUseCase.ts:39–46`.

Errors and HTTP mappings unchanged:

| Condition | Error | HTTP |
|---|---|---|
| Caller not space admin AND not org admin | `SpaceAdminRequiredError` | 403 |
| Default space, removeMember | `CannotRemoveFromDefaultSpaceError` | 400 |
| Self-removal | `CannotRemoveSelfError` | 400 |
| Self-role-change | `CannotUpdateOwnRoleError` | 400 |
| Target user not a member | `MemberNotFoundError` | 400 |

Logging unchanged. PII rule (`standard-compliance-logging-personal-information`) remains satisfied — none of these use cases log emails.

Adapters and services: no change. The use-case constructors are unchanged. `SpacesAdapter` continues to compose them as today.

### Frontend (composition only — no new mutations)

The drawer is a pure composition of existing hooks:

| Tab | Hooks used (all existing) |
|---|---|
| General | `useUpdateSpaceMutation` |
| Members | `useGetSpaceMembersQuery`, `useAddMembersToSpaceMutation`, `useRemoveMemberFromSpaceMutation`, `useUpdateMemberRoleMutation` |
| Danger | `useDeleteSpaceMutation` |

Drawer-local state: `activeTab` (`'general' | 'members' | 'danger'`), `memberToRemove` (lifted from existing `SpaceMembersList`). Closing the drawer clears both. `selectedSpace` lives one level up in `SpacesManagementPage`.

The new hook to add: an explicit listing-key invalidation inside the drawer's `onSuccess` handlers for identity update, member changes, and delete:

```ts
queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'spaces', 'management'] });
```

This is a 3-line block per mutation site, not a new hook.

## API / CLI / Frontend Surface

### Backend

No new endpoints. No request/response shape changes. The four affected endpoints are listed below for reference.

| Method | Path | Effective change |
|---|---|---|
| `POST   /organizations/:orgId/spaces/:spaceId/members` | Org admins (not space members) succeed |
| `DELETE /organizations/:orgId/spaces/:spaceId/members/:targetUserId` | Org admins (not space members) succeed |
| `PATCH  /organizations/:orgId/spaces/:spaceId/members/:targetUserId` | Org admins (not space members) succeed |
| `PATCH  /organizations/:orgId/spaces-management/:spaceId` | (already supported org admins; unchanged) |

### Frontend

**Files refactored** (`apps/frontend/src/domain/spaces/components/`):
- `SpaceMembersList.tsx` — props change to `{ space: Space, isSpaceAdmin: boolean }`; `useCurrentSpace` removed; existing toaster + confirmation modal logic preserved. `useGetSpaceMembersQuery(space.id)` continues to be called internally (TanStack dedupes against the drawer's own call).
- `SpaceDangerZoneSection.tsx` — props change to `{ space: Space, canDelete: boolean, onDeleted?: () => void }`; `useCurrentSpace` removed. Existing wiring (`useDeleteSpaceMutation` + redirect on success) preserved when `onDeleted` is omitted; when `onDeleted` is provided, it runs after the mutation resolves and the default redirect is skipped.
- `SpaceGeneralSettings.tsx` — minimal adapter change: continues to call `useCurrentSpace`; now passes `space` to `SpaceDangerZoneSection` explicitly. External prop API unchanged.
- `SpaceSettingsPage.tsx` — minimal adapter change: passes `space` + `isSpaceAdmin` (derived locally) into `SpaceMembersList`. Tabs structure unchanged.

**Files created** (`apps/frontend/src/domain/spaces/components/SpacesManagementPage/`):
- `SpaceManagementDrawer.tsx` — drawer container described in Architecture. Composes `SpaceIdentitySection`, `SpaceMembersList` (with its existing add/remove machinery), `SpaceDangerZoneSection` inside `PMDrawer` + `PMTabs`. Hides Danger tab when `space.isDefaultSpace`.
- `SpaceManagementDrawer.test.tsx`.

**Files modified** (`apps/frontend/src/domain/spaces/components/SpacesManagementPage/`):
- `SpacesTable.tsx` — adds `onSelectSpace(space)` callback prop fired on row body click; existing `onView` / `onDelete` row actions preserved. Click-target isolation: clicks on buttons inside the row don't bubble to the row handler.
- `SpacesManagementPage.tsx` — owns `selectedSpace` state; renders the drawer.

**Files deleted**: none.

### Routing

No URL change. The drawer is local UI state on `/org/:orgSlug/settings/spaces`. (Tradeoff acknowledged: drawer doesn't deep-link.)

### Toolbar / pagination / row actions

Unchanged. Search / filter dropdowns remain visual-only (already out of scope per the listing spec). Pagination behaviour unchanged.

### Feature flag

The whole `/settings/spaces` route is already gated by `ORGA_SPACE_MANAGEMENT_FEATURE_KEY`. The drawer inherits this gate — no new flag.

## Testing Approach

### Backend

| File | Coverage |
|---|---|
| `AddMembersToSpaceUseCase.spec.ts` (update) | New: org admin (no space membership) successfully adds members; emits `SpaceMembersAddedEvent` with org admin's `userId`. Existing space-admin path still passes. Existing failure cases (no permissions, etc.) preserved. |
| `RemoveMemberFromSpaceUseCase.spec.ts` (update) | New: org admin (no space membership) removes any member of a non-default space. Existing `CannotRemoveFromDefaultSpaceError` and `CannotRemoveSelfError` paths still raise. |
| `UpdateMemberRoleUseCase.spec.ts` (update) | New: org admin (no space membership) updates any member's role. `CannotUpdateOwnRoleError` still raised when org admin equals target. `MemberNotFoundError` still raised when target isn't in space. |
| `members.controller.spec.ts` (extend) | One additional case: org-admin caller with no space membership returns 200 from `addMembers`, `removeMember`, `updateMemberRole`. Match the existing unit-style controller test pattern (no Nest test module). |

No repository / DB integration test changes — schema unchanged.

### Frontend

| File | Coverage |
|---|---|
| `SpaceManagementDrawer.test.tsx` (new) | Renders header (color dot + name + subtitle "`createdAt` · N members · M artifacts"); shows three tabs for non-default space and two tabs (no Danger) for default space; switching tabs renders the right section component; `onClose` clears `activeTab`/`memberToRemove`. Uses the documented PMTable Jest mock for the Members tab. |
| `SpaceMembersList.test.tsx` (update) | Now driven by props; existing role-change + remove paths still pass; new assertion: when `isSpaceAdmin=false`, Add button is hidden and role/remove controls are disabled. |
| `SpaceDangerZoneSection.test.tsx` (update) | Prop-driven; on delete success with `onDeleted` provided, the callback is invoked (and the default redirect is skipped). When `onDeleted` is omitted, behaviour is unchanged. |
| `SpaceGeneralSettings.test.tsx` (update if exists) | Verify the adapter still passes `space` correctly into `SpaceDangerZoneSection` after the refactor; otherwise covered by `SpaceSettingsPage` integration tests. |
| `SpacesManagementPage.test.tsx` (update) | Row click opens drawer; existing kebab menu still functions; identity update / member change / delete invalidate the listing key (mock mutation `onSuccess` to assert `queryClient.invalidateQueries` was called with the right key). |
| `SpacesTable.test.tsx` (update) | New `onSelectSpace` callback fired on row body click; not fired when clicking the kebab menu or row action buttons (event isolation). |

### E2E (Playwright, under `apps/e2e-tests/`)

- **Identity edit** — org admin opens `/settings/spaces`, clicks a non-default space row, renames it in the General tab, saves; the listing row reflects the new name.
- **Color change** — org admin picks a new color in the General tab, saves; the row's color dot updates.
- **Promote member** — org admin opens the drawer for a space they are NOT a member of, switches to Members tab, changes a member's role from member → admin; the listing row's admin column reflects the new admin.
- **Remove member** — org admin removes a non-default-space member; drawer refreshes, listing member count drops by 1.
- **Default space** — open drawer on the org's default space; assert no Danger tab is rendered, the name input is disabled, and the color picker remains enabled.

E2E follows the existing Page Object Model pattern.

### Test data and authz fixtures

Backend specs need fixtures where the caller is an org admin who is NOT a member of the target space. The existing `AbstractSpaceAdminUseCase.spec.ts` already exercises this access matrix — copy its setup. Use-case specs continue to mock ports per the established convention (no real DB).

## Out of Scope

- Visibility/type editing in the drawer (stays only in `/space/:slug/settings`).
- Drawer URL deep-linking and back-button history.
- Replacing or merging the existing per-space `/space/:slug/settings` page.
- Toolbar search / filter functionality (visual-only).
- Autosave / drawer-level dirty state.
- Bulk-edit operations across multiple spaces.
- Centralising the listing-key invalidation in shared mutation `onSuccess` helpers.
- Folder reorganisation of `apps/frontend/src/domain/spaces-management/` vs `apps/frontend/src/domain/spaces/`.
- New analytics events (existing space + membership events keep emitting unchanged).
