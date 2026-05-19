User Story Review: Organization Spaces Management Page

# Rule 1: Eligible users can access the spaces management page from the organization settings

## Example 1

The user is signed in to an organization and the `orga-space-management` feature flag is enabled for them.

The user navigates to `/org/{orgSlug}/settings/spaces`.

The page renders with title "Spaces" and subtitle "Manage every space in your organization · {N} spaces".

# Rule 2: The page displays organization spaces in a paginated table sourced from a dedicated listing endpoint

## Example 1

The organization contains 32 spaces (including the org-wide default space "Global").

The user lands on `/settings/spaces`.

The page calls a dedicated listing endpoint that returns 8 spaces per page, sorted with the default space first then by `createdAt` ascending. The table displays the first 8 spaces with columns: Name, Admins, Members, Artifacts, Created.

## Example 2

For each row in the table:

- The Name column shows a colored dot (color derived from `space.id` on the frontend), the space name, and an `org-wide` badge for the default space.
- The Admins column shows up to 3 avatar bubbles for users with `UserSpaceMembership.role === ADMIN` on that space, plus the count "{N} admins" — or the admin's display name when there is exactly one.
- The Members column shows the count of users with `UserSpaceMembership.role === MEMBER` (non-admin members) on that space.
- The Artifacts column shows the sum of standards, recipes, and skills attached to the space.
- The Created column shows the formatted creation date (e.g., "12 Jan 2025").

## Example 3

The user clicks page 2 in the pagination control.

The endpoint is called again with `page=2`.

The next 8 spaces are returned in the same sort order and rendered in the table.

# Rule 3: Eligible users can create a new space from the management page and remain on the page

## Example 1 <!-- E2E -->

The user clicks `+ New space` in the toolbar.

A "Create new space" dialog opens. The user enters a name and selects a visibility, then clicks `Create space`.

The space is created, the dialog closes, the user remains on `/settings/spaces`, the spaces query is invalidated, and the new space appears in the table.

# Rule 4: A space can be deleted from a row action with a confirmation modal

## Example 1 <!-- E2E -->

The user opens the row actions menu on a non-default space and clicks `Delete`.

A confirmation modal appears with the message "Delete space '{name}'? This action is irreversible." and `Cancel` / `Delete` buttons.

The user clicks `Delete`; the space is deleted, the modal closes, the spaces query is invalidated, and the row is removed from the table.

## Example 2

The user opens the row actions menu on the default org-wide space.

The `Delete` action is hidden (the backend rejects deletion of the default space).

# Rule 5: A space row exposes a "View" action that navigates to the space's dashboard

## Example 1

The user opens the row actions menu and clicks `View`.

The user is navigated to `/org/{orgSlug}/spaces/{spaceSlug}` (the space dashboard).

# Technical rules

- Page is gated behind `ORGA_SPACE_MANAGEMENT_FEATURE_KEY` (`orga-space-management`).
- Pagination is server-side via the new listing endpoint with a fixed page size of 8.
- Default sort: default org-wide space first, then `createdAt` ascending.
- The default org-wide space cannot be deleted (existing `CannotDeleteDefaultSpaceError`).
- Delete authorization: org admin OR space admin (existing `DeleteSpaceUseCase` rules apply unchanged).
- Search input and Admin/Member filter dropdowns remain visual-only (no behavior wired in this iteration).
- Row action `Edit` is hidden in this iteration.
- Space color shown next to the name is derived deterministically from `space.id` on the frontend (no backend persistence).
- The listing endpoint accepts `page` and returns at minimum the rows for the page plus the total count for pagination UI; aggregation (admins, member count, artifact count) avoids N+1 queries across spaces.

# User Events

None defined for this iteration.

---

Check also the following rules are applied:

- Bulk delete is out of scope: the existing `SpacesBulkActionBar` rendering and the row-checkbox selection state are removed from the page (no inert UI left behind).
- The Admins avatar group caps visible avatars (per `PMAvatarGroup` behavior) and shows the total count as "{N} admins" or the single admin's display name when there is one.
- Loading and error states for the table are preserved from the current implementation.
- After successful delete: success toast. On failure: error toast.
- The View action is hidden (or disabled) when navigation would not resolve (e.g., space slug missing).
