User Story Review: Manage space identity

# Rule 1: Space and orga administrators can update the space identity (color & name)

## Example 1 <!-- E2E -->

Bob is an administrator of the space "oddity".

He can update the space identity.

## Example 2 <!-- E2E -->

Bob is an organisation administrator.

He can update the space identity.

## Example 3 <!-- E2E -->

Bob is a member of the space "oddity". He is not an organisation administrator.

He can not update the space identity.

# Rule 2: Slugs are not updated alongside the name

## Example 1 <!-- E2E -->

Bob is administrator of space "secrurity" (with a typo).

He updates the name space to "security" (without the typo).

The space still has the "secrurity" slug.

## Example 2

Bob is administrator of space "secrurity" (with a typo).

He updates the name space to "security" (without the typos).

After the update, he sees a warning saying that the slug does not match the name anymore.

# Rule 3: Spaces can not have slug colliding names

## Example 1 <!-- E2E -->

Spaces "Security Connections" and "Security" belong to orga "Foo".

Bob renames space "Security Connections" to "Security".

Bob gets an error as two spaces with the same slug cannot exist and renaming is cancelled.

# Rule 4: Chosen space color is the same for all the users of the organization

## Example 1 <!-- E2E -->

Bob updates the space "oddity" color to "light blue".

When John opens the web app.

He sees the "oddity" space with a "light blue" chip/label/thingy.

# Rule 5: Default space can not be renamed

## Example 1 <!-- E2E -->

Bob is administrator of the default space "Global".

He can change the default space color.

## Example 2

Bob is administrator of the default space "Global".

He can not rename the space.

# Technical rules

- Unauthorized space identity updates: the frontend keeps the form visible but disabled; if the backend is called anyway, it throws an error
- When editing the default space, the name field is present in the form but disabled
- Renaming a space must not update its slug — slugs remain stable across name changes
- Slug uniqueness must be enforced within the scope of an organization; a rename that would cause a slug collision must be rejected before persistence

# User Events

- `space_renamed`: emitted when a space is successfully renamed

---

Check also the following rules are applied:

- Space identity updates cover both the `name` and the `color` fields
- A warning is surfaced to the user when the slug no longer matches the updated name
- The color update is propagated to all users of the organization (not just the user who performed the update)
- The default space rename restriction applies regardless of the acting user's role (space admin or organization admin)
