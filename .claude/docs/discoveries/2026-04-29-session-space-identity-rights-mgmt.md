---
name: Session - space identity and rights management drawer
description: 2026-04-29 session implementing the spaces-management drawer (general/members/danger), org-admin override on space-admin use cases, and PMTable row-click workaround
type: project
---

# Session: space identity and rights management drawer

**Date:** 2026-04-29
**Found while:** executing `.claude/plans/2026-04-29-space-identity-and-rights-management.md` (spec at `.claude/specs/2026-04-29-space-identity-and-rights-management-design.md`)

## What shipped

A drawer-based per-space management UI for org admins: clicking a row in the spaces management listing opens a 3-tab drawer (General, Members, Danger) that reuses the per-space settings sections. Backend now lets org admins bypass space-admin checks on the three remaining member-mutation use cases.

### Backend (4 commits)
- `bd0759b21` — `AddMembersToSpaceUseCase`: org-admin override (`executeForMembers` short-circuits to `executeForSpaceAdmins` when `command.membership.role === 'admin'`).
- `d55c0d14f` — `RemoveMemberFromSpaceUseCase`: same override. Spec's default `user` factory flipped from `role: 'admin'` to `role: 'member'` to keep "not space admin" tests honest.
- `986f7b3bd` — `UpdateMemberRoleUseCase`: same override + same spec-factory flip.
- `a09ece54e` — NEW `apps/api/src/app/organizations/spaces/members/members.controller.spec.ts` — three smoke tests for org-admin paths (file didn't exist before).

### Frontend (9 commits)
- `3c085d866` — `SpaceMembersList` made prop-driven: `{ space: Space; isSpaceAdmin: boolean }` (was reading from `useCurrentSpace`).
- `3f722251d` — `SpaceDangerZoneSection` made prop-driven: `{ space: Space; canDelete: boolean; onDeleted?: () => void }`. UX shift: delete button is now visible-but-disabled when `canDelete=false` (was previously hidden entirely).
- `998961640` — `SpaceGeneralSettings`: passes `space` + renamed prop `canDeleteSpace` → `canDelete`.
- `b177a0ef6` — `SpaceSettingsPage`: derives `isSpaceAdmin` from members query, passes both props down.
- `6c8a2e413` — NEW `apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpaceManagementDrawer.tsx`. Composes `SpaceIdentitySection`, `SpaceMembersList`, `SpaceDangerZoneSection`. 3 tabs (General / Members / Danger). Danger tab omitted when `space.isDefaultSpace`. Header: colored status indicator + member/artifact counts. Permissions: `canEdit = canDelete = isSpaceAdmin || isOrgAdmin`. Tab reset on space change via `useEffect`.
- `479eadcef` — `SpacesTable` got optional `onSelectSpace` prop. Per-row click via `RowClickArea` PMBox-div wrapping each non-actions cell, with `target.closest('button, a, input, [role="menu"], [role="menuitem"]')` interactive-element guard. Workaround: PMTable doesn't expose `onRowClick`.
- `d4f41ffb6` — `SpacesManagementPage` holds `selectedSpace: SpaceManagementListItem | null`, looks up raw item by id from query data on row select, renders the drawer.
- `140d3cd56` — `SpaceIdentitySection`: invalidates `['organizations', orgId, 'spaces', 'management']` on successful update.
- `098f7c5f2` — `SpaceMembersList`: same invalidation (extracted to `invalidateManagementListing` helper) for remove/role-change. `AddSpaceMembersDialog` got new optional `onSuccess?: () => void` prop, lifted from the dialog so the dialog stays presentational.

## Patterns and discoveries

### 1. Org-admin override on space-admin member-mutation use cases
Now uniformly applied to four use cases: `UpdateSpaceUseCase` (prior work) + `AddMembersToSpaceUseCase` + `RemoveMemberFromSpaceUseCase` + `UpdateMemberRoleUseCase`. Pattern: a thin `executeForMembers` override that short-circuits to `executeForSpaceAdmins` when `command.membership.role === 'admin'`. Promoted to standalone pattern doc: `.claude/docs/patterns/backend/org-admin-override-on-space-admin-usecases.md`.

### 2. Prop-driven per-space sections (composable across settings page + management drawer)
Converting `SpaceMembersList` and `SpaceDangerZoneSection` from `useCurrentSpace`-coupled to `space`/permission-prop driven made them reusable in two contexts: the per-space settings page (route-scoped, has `useCurrentSpace`) and the org-admin management drawer (no current-space context, drawer is given a `SpaceManagementListItem`). Promoted to standalone pattern doc: `.claude/docs/patterns/frontend/prop-driven-space-sections.md`.

### 3. Listing-key invalidation gap — recurrence
The `['organizations', orgId, 'spaces', 'management']` (plural) family is still not invalidated by shared mutations. This session added two more manual-invalidation callers (`SpaceIdentitySection`, `SpaceMembersList` via `invalidateManagementListing` helper). Already documented in `.claude/docs/discoveries/2026-04-28-session-orga-space-management.md` item 7. Centralization (lifting invalidation into the underlying mutations' `onSuccess`) is now the simplest next step — the manual-invalidation footprint has grown from 1 to 4+ callers.

### 4. PMTable row click workaround (`RowClickArea`)
PMTable does not expose an `onRowClick` prop. Workaround used in `SpacesTable.tsx`: wrap each non-actions cell's content in a `RowClickArea` (a PMBox div with `cursor: 'pointer'` + an interactive-element guard via `target.closest('button, a, input, [role="menu"], [role="menuitem"]')`). Each cell handles its own click; bulk-action / select cells stay clean. Not a pattern doc — single-use today and load-bearing on PMTable internals. **Better long-term fix:** add `onRowClick` to PMTable upstream and migrate. If a second consumer needs row click before then, promote to a pattern doc.

### 5. Drawer over modal for per-space management
The drawer (right-side, full-height) was chosen over a modal because the Members tab can host long lists + an add-members dialog. Tabs reset on space change via `useEffect` (not via `key=` on the drawer) to keep `Drawer` open + animated as the user navigates between rows. Danger tab is conditionally rendered (omitted when `space.isDefaultSpace`) so users never see a tab they can't act on.

### 6. Spec-factory hygiene when adding admin overrides
When adding an "admin override" to a use case spec, the spec's default user factory must NOT default to `role: 'admin'` — otherwise existing "not-space-admin" tests will silently pass via the override path. Tasks 2 and 3 flipped the default to `role: 'member'`, mirroring what `AddMembersToSpaceUseCase.spec.ts` had already done in earlier work. Watch for this when porting overrides to new use cases.

## Domains and routes touched
- Backend: `packages/spaces` (3 use cases get the override), `apps/api/src/app/organizations/spaces/members/` (new spec).
- Frontend: `apps/frontend/src/domain/spaces/components/` (5 sections refactored or extended), `apps/frontend/src/domain/spaces/components/SpacesManagementPage/` (new drawer + table row-click).
- No new HTTP routes. No new use cases. No new ports/repository methods.

## Why it matters
- The org-admin override pattern is now a copy-paste template across 4 use cases — codifying it in a pattern doc prevents future drift.
- The prop-driven section refactor unlocks reuse of per-space UI in admin contexts; same pattern can be applied to other "current-space" components when admin needs them.
- Manual listing-key invalidation has crossed a threshold that justifies centralizing — flag this on the next mutation touch.

## Where it applies
- Backend: any future space-admin use case that should also be callable by org admins (e.g., space-level settings, integrations).
- Frontend: any per-space component currently using `useCurrentSpace` that an admin context might need to reuse without that context.
- Cross-cutting: the listing-key invalidation gap touches anything that mutates a space's identity or membership.

## Deferred
- E2E tests for the drawer flows.
- Centralization of listing-key invalidation into shared mutations.
- Upstream `onRowClick` on PMTable (ticket TBD).

## Reference
- Plan: `.claude/plans/2026-04-29-space-identity-and-rights-management.md`
- Spec: `.claude/specs/2026-04-29-space-identity-and-rights-management-design.md`
- Prior session: `.claude/docs/discoveries/2026-04-28-session-orga-space-management.md` (introduces the plural-key listing and the management page itself)
