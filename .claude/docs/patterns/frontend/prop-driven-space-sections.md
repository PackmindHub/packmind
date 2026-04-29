---
name: Prop-driven per-space sections
description: Per-space UI sections should accept space + permission props (not read from useCurrentSpace) so they can be reused in admin/management contexts that lack a current-space provider
type: feedback
---

# Prop-driven per-space sections

**Domain:** frontend / `apps/frontend/src/domain/spaces/components/`
**Last confirmed:** 2026-04-29

## When to use

You're writing or refactoring a component that displays/mutates a single space's data and could plausibly be needed in **two** contexts:
1. The per-space settings page (route-scoped, has `useCurrentSpace`).
2. An admin/management context (e.g. a drawer over a list) where there's no current-space route.

## How it works

Don't read the space or permissions from `useCurrentSpace`/route hooks. Accept them as props.

```ts
// Prop-driven shape
type Props = {
  space: Space;
  isSpaceAdmin: boolean; // or canDelete, canEdit, ...
  onDeleted?: () => void; // optional caller hook for invalidation/close
};
```

The per-space settings page wires the props from `useCurrentSpace` + members query; the management drawer wires them from its own selected `SpaceManagementListItem` + `isOrgAdmin`. The component itself stays context-agnostic.

## Canonical examples

- `apps/frontend/src/domain/spaces/components/SpaceMembersList.tsx` — props: `{ space: Space; isSpaceAdmin: boolean }`.
- `apps/frontend/src/domain/spaces/components/SpaceDangerZoneSection.tsx` — props: `{ space: Space; canDelete: boolean; onDeleted?: () => void }`.
- Composed by:
  - `apps/frontend/src/domain/spaces/components/SpaceGeneralSettings.tsx` (settings page).
  - `apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpaceManagementDrawer.tsx` (management drawer).

## Common mistakes

- **Hidden vs disabled when permission is false**: prefer visible-but-disabled over conditionally hidden — admins glancing at a space they don't fully control should still see what actions exist. `SpaceDangerZoneSection` shifted to this in 2026-04-29 (`canDelete=false` → button disabled, was previously hidden).
- **Leaving `useCurrentSpace` calls inside subcomponents**: if any descendant still reads `useCurrentSpace`, the component will explode in the management drawer (no provider). Audit recursively when refactoring.
- **Naming permission props after the role instead of the action**: `canDelete` is clearer at the call site than `isSpaceAdmin` when the section only does one thing. `SpaceGeneralSettings` rename `canDeleteSpace → canDelete` (commit `998961640`) reflects this.
- **Coupling invalidation to the component**: emit `onSuccess`/`onDeleted` callbacks; let the caller decide which query keys to invalidate. The drawer needs to invalidate the listing query; the settings page may not. Keep components presentational.

## Why

`useCurrentSpace` only resolves under the per-space route. Admin contexts (drawer, dashboard widgets, cross-org views) operate on lists or selections without that provider, so any component coupled to `useCurrentSpace` is non-reusable there. Lifting the dependency makes the component composable in any context.

## How to apply

When adding a per-space component: default to props for `space` + permissions. Reach for `useCurrentSpace` only when the component is genuinely route-scoped and unlikely to be reused. When refactoring an existing one, audit the descendants too.
