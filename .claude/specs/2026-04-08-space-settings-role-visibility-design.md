# Space Settings Button — Role-Based Visibility

## Context

The space settings button in the sidebar is currently behind a feature flag limited to internal emails. It should be visible only to space admins (space-level role, not org-level).

## Scope

Backend + types + frontend. No new API endpoints.

## Changes

### Types: `ListUserSpacesResponse`

Change the response to include the user's space role:

```typescript
export type ListUserSpacesResponse = {
  spaces: (Space & { role: UserSpaceRole })[];
};
```

File: `packages/types/src/spaces/contracts/IListUserSpaces.ts`

### Backend: `ListUserSpacesUseCase`

The use case already queries memberships to find the user's spaces. Join the role from each membership onto the corresponding space in the response.

### Frontend: `SpaceNavBlock`

Replace the `PMFeatureFlag` wrapper around the settings button with a check on `space.role === 'admin'`. Remove the feature flag imports (`SPACE_SETTINGS_FEATURE_KEY`, `DEFAULT_FEATURE_DOMAIN_MAP`, `PMFeatureFlag`).

The `Space` objects flowing through `CustomSpacesNavBlock` -> `SpaceNavBlock` will carry the role from the enriched `listUserSpaces` response.

### Tests

- Update `ListUserSpacesUseCase` tests to verify role is included in response
- Update frontend tests if any assert on the settings button visibility

## Out of scope

- Org-level admin override (org admins seeing settings for all spaces)
- Changing what the settings page allows based on role (just visibility of the button)
