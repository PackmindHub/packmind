# Admin Browse & Join All Spaces

## Context

Organization administrators need to see and join all spaces, including private ones. Currently `BrowseSpacesUseCase` filters out private spaces for all users, and `JoinSpaceUseCase` rejects private/restricted spaces and always assigns `UserSpaceRole.MEMBER`.

## Scope

Backend only — no frontend changes needed. The existing BrowseSpacesDrawer and join page already work with whatever `allSpaces` returns.

## Changes

### BrowseSpacesUseCase

Skip the `type !== SpaceType.private` filter when the user is an org admin. The org role is available via `command.membership.role` (from `MemberContext`).

```typescript
const isOrgAdmin = command.membership.role === 'admin';

const allSpaces: BrowsableSpace[] = allOrgSpaces
  .filter(
    (space) =>
      !memberSpaceIds.has(space.id) &&
      !space.isDefaultSpace &&
      (isOrgAdmin || space.type !== SpaceType.private),
  )
```

Non-admin behavior unchanged. Default spaces still excluded for everyone.

### JoinSpaceUseCase

Two changes when user is an org admin:
1. Skip the space type restriction (currently rejects private and restricted spaces)
2. Assign `UserSpaceRole.ADMIN` instead of `UserSpaceRole.MEMBER`

The membership role is available via `command.membership.role` from `MemberContext` (the use case extends `AbstractMemberUseCase`).

Non-admin behavior unchanged — they can still only join open spaces and get `MEMBER` role.

### Test coverage

Update existing test files for both use cases:
- Admin sees private spaces in `allSpaces`
- Admin does not see private spaces they're already a member of
- Admin can join a private space
- Admin gets `UserSpaceRole.ADMIN` on join
- Non-admin still cannot see or join private spaces

## Out of scope

- Frontend changes (not needed)
- Restricted space approval workflow
- Admin role escalation on spaces they already belong to
