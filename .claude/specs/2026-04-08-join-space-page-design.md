# Join Space Page

## Context

When a user runs `packmind-cli install` and lacks access to a space, or when a team member shares a space link in Slack, they need a frontend page to confirm joining the space.

No new backend work is needed — this reuses the existing `browseSpaces` and `joinSpace` APIs.

## Route

`/:orgSlug/spaces/:spaceId/join`

- Uses spaceId (UUID) to ensure links survive space renames (slugs change on rename).
- orgSlug is kept for readability and org context.

## Scope

- Open spaces only. Private spaces are filtered out by `browseSpaces` and are not supported in this iteration.
- Restricted spaces appear in `browseSpaces` but join behavior depends on existing `joinSpace` API authorization.

## Data Loading

The `clientLoader` calls `browseSpaces` (existing endpoint) and:

1. Checks if the space is in `mySpaces` -> already a member -> redirect to space dashboard with toast "You're already a member".
2. Finds the space in `allSpaces` -> renders confirmation page with space info.
3. Space not found in either list -> renders error message "Space not found or not available".

## Page UI

### Confirmation state (default)

- Space name with color indicator (reuse `getSpaceColorPalette` from `SpaceNavBlock`)
- Space type badge ("Open")
- "Join this space" button

### States

| State | Behavior |
|-------|----------|
| Loading | Spinner while `browseSpaces` loads |
| Confirmation | Space info + join button |
| Joining | Button shows loading spinner, disabled |
| Already member | Redirect to space dashboard + toast "You're already a member" |
| Space not found | Error message "Space not found or not available" on page |
| Join error | Toast with error message, button re-enabled |

### After successful join

Redirect to the space dashboard.

## Technical Details

### Existing APIs reused

- `GET /organizations/:orgId/spaces-management/browse` — fetch space info and membership check
- `POST /organizations/:orgId/spaces-management/:spaceId/join` — join the space

### Existing code reused

- `useBrowseSpacesQuery()` / `useJoinSpaceMutation()` from `SpacesManagementQueries.ts`
- `getSpaceColorPalette()` from `SpaceNavBlock.tsx`
- Standard auth flow handles unauthenticated users (redirect to login, then back to join route)
- `routes.space.toDashboard()` for post-join redirect

### New files

- Route module: `apps/frontend/src/routes/:orgSlug/spaces/:spaceId/join.tsx` (or equivalent React Router v7 file-based route)
- No new components expected — page is simple enough to live in the route module

## Out of scope

- Private space join links (requires dedicated endpoint)
- Join request/approval workflow for restricted spaces
- Space description or member count on the confirmation page
