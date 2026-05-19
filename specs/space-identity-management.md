User Story Review: Space identity management (name & color)

# Rule 1: Space and orga administrators can update the space identity (color & name)

## Example 1

Bob is an administrator of the space "Identity".

He can update the space identity.

## Example 2

Bob is an organization administrator.

He can update the space identity.

## Example 3

Bob is a member of the space "Identity". He is not an organization administrator.

He can not update the space identity.

# Rule 2: Slugs are not updated alongside the name

## Example 1

Bob is administrator of space "Security" (with a typo).

He updates the space name to "Security" (without the typo).

The space still has the "security" slug.

# Rule 3: Spaces can not have slug colliding names

This rule applies at **space creation time only**. Renames do not change a space's slug (see Rule 2), so no rename-time check is required. The rule is documented here for completeness — it is already enforced by `CreateSpaceUseCase` via `SpaceSlugConflictError`.

# Rule 4: Chosen space color is the same for all the users of the organization

## Example 1

Bob is an administrator of the space "Ability".

He updates the space "Ability" color to "light blue".

When John opens the web app, he sees the "Ability" space as "light blue".

# Rule 5: Default space can not be renamed

## Example 1

Bob is an administrator of the default space "Global".

He can change the default space color.

## Example 2

Bob is an administrator of the default space "Global".

He can not rename the default space.

# Technical rules

- Only space administrators and organization administrators are authorized to update a space's identity (name & color). On the frontend, the identity form is rendered but its fields are disabled for users without permission. On the backend, the update endpoint throws an error if a non-authorized user attempts to update.
- Slugs are NOT updated when the space name changes — slugs remain stable after space creation.
- Slug collision is validated at space creation only (already enforced via `SpaceSlugConflictError`). Renames do not trigger a slug collision check because slugs are not updated alongside the name.
- The default space cannot be renamed: the name field is rendered on the frontend but disabled; the backend rejects any rename attempt targeting the default space. Color updates on the default space are allowed.

# User Events

- `space_renamed`: emitted when a space is successfully renamed. Properties: `space_id`, `old_name`

---

Check also the following rules are applied:

- Color updates are visible to all users of the organization (no per-user preference).
- Authorization checks are enforced on the backend regardless of frontend state.
