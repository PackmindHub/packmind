# Browse Spaces — Design Spec

**Date:** 2026-04-07

## Overview

Allow users to browse and discover spaces within their organization. Users see a drawer with two tabs: "My spaces" (spaces they belong to) and "All spaces" (open + restricted spaces they can discover). Users can self-join open spaces without approval.

All new code lives in `packages/spaces-management` (proprietary) and `apps/frontend/src/domain/spaces-management/`.

## Acceptance Criteria

1. When a user browses spaces, results contain the union of (1) spaces they belong to and (2) open/restricted spaces — deduplicated.
2. Only open and restricted spaces appear in "All spaces". Private spaces are invisible to non-members.
3. Users can self-join open spaces without approval.
4. Restricted spaces appear in "All spaces" but have no join action (future: approval flow).
5. Search filters spaces by name (client-side) within the active tab.

## Backend

### Browse Spaces Endpoint

`GET /organizations/:orgId/spaces-management/browse`

**Response:**

```typescript
{
  mySpaces: Space[];
  allSpaces: BrowsableSpace[];
}

type BrowsableSpace = {
  id: SpaceId;
  name: string;
  type: SpaceType; // open or restricted — never private
};
```

**Logic:**

1. Fetch user's space memberships for the org → `mySpaces`
2. Fetch all org spaces where `type IN ('open', 'restricted')` AND user is NOT a member → `allSpaces`
3. Default space is excluded from `allSpaces` (all org members are automatically added)

**Location:** New use case `BrowseSpacesUseCase` in `packages/spaces-management/src/application/usecases/`.

### Join Space Endpoint

`POST /organizations/:orgId/spaces-management/:spaceId/join`

**Response:** `204 No Content`

**Logic:**

1. Verify space exists, belongs to the org, and is `open`
2. Verify user is not already a member
3. Add membership with role `MEMBER`, `createdBy` = requesting user
4. Restricted spaces → reject with `403 Forbidden`
5. Private spaces → reject with `404 Not Found` (space not visible)

**Location:** New use case `JoinSpaceUseCase` in `packages/spaces-management/src/application/usecases/`.

## Frontend

### BrowseSpacesDrawer Component

Copied from the playground prototype (`apps/playground/src/prototypes/sidebar-with-spaces/components/BrowseSpacesDrawer.tsx`), adapted to use real API data instead of mocks.

**Location:** `apps/frontend/src/domain/spaces-management/components/`

**Structure:**

- `PMDrawer` with "start" placement
- Header: close button, "Spaces" title, "New" button (existing create space action)
- Tab navigation: "My spaces" / "All spaces"
- Search input filtering the active tab (client-side, by space name)

**"My spaces" tab:**

- Flat alphabetical list of `mySpaces`
- Each row: colored dot + space name + pin star toggle
- Click row → navigate to space, close drawer
- Pin state is client-side only (no backend persistence)

**"All spaces" tab:**

- Flat alphabetical list of `allSpaces`
- Each row: colored dot + space name + action button
  - `open` type → "Join" button (secondary variant, user+ icon)
  - `restricted` type → no action button (future: "Request access")
- After successful join → invalidate browse + spaces queries, both tabs refresh

### Data Layer

**New query hook:** `useBrowseSpacesQuery(orgId)` — calls `GET .../spaces-management/browse`

**New mutation:** `useJoinSpaceMutation()` — calls `POST .../spaces-management/:spaceId/join`, invalidates browse and spaces query keys on success.

**Gateway:** New methods in `SpacesManagementGatewayApi`.

### Integration Point

The existing `BrowseSpaces.tsx` stub in `apps/frontend/src/domain/spaces-management/` (currently returns null) becomes the entry point — renders the drawer trigger and the drawer itself.

## Testing

### Backend Unit Tests

- **BrowseSpacesUseCase:**
  - Returns user's spaces in `mySpaces`
  - Returns open + restricted non-member spaces in `allSpaces`
  - Excludes private spaces from `allSpaces`
  - Excludes default space from `allSpaces`
  - No duplicates between `mySpaces` and `allSpaces`

- **JoinSpaceUseCase:**
  - Happy path: user joins open space, membership created with MEMBER role
  - Rejects join on private space (404)
  - Rejects join on restricted space (403)
  - Rejects if user is already a member
  - Rejects if space belongs to another org

### Frontend Tests

- **BrowseSpacesDrawer:**
  - Renders both tabs with correct content
  - Search filters spaces by name
  - "Join" button calls mutation
  - Drawer closes on space click in "My spaces" tab

### E2E

- User browses spaces, sees open spaces they don't belong to, joins one without approval
