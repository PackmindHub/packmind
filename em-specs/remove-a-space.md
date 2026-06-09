User Story Review: Remove a space

# Rule 1: Only administrators can remove a space

## Example 1

Bob is a member of the organization and is not an administrator of space "spaces".

He can not remove this space.

## Example 2

Bob is a member of the organization and is an administrator of the space.

He can remove the space.

## Example 3

Bob is an administrator of the organization.

He can remove the space.

# Rule 2: User is warned that action is irreversible

## Example 1

Bob removes space "oddity".

Before validating, a warning is shown telling all the impacted packages and deployments.

# Rule 3: Artefacts are not accessible when the space is removed

## Example 1

Bob has removed space "oddity". In the `packmind.json` file, the following packages are installed:

- `@oddity/my-package`

When Bob runs `packmind install`, he gets an error saying the package `@oddity/my-package` does not exist.

# Rule 4: Deleted space names are not reserved

## Example 1

Bob has removed space "oddity".

Bob can create a new space named "oddity".

# Rule 5: Default space can not be deleted

## Example 1

Bob tries to remove the default space.

Nothing happens.

# Technical rules

- Spaces are soft-deleted
- Memberships are soft-deleted too
- Default space deletion prevention: Frontend shows no button. Backend returns error `422`.

---

Check also the following rules are applied:

- Organization administrators can remove any space except the default space
- Memberships are properly soft-deleted when a space is removed
- Artefacts from a deleted space are no longer accessible via CLI
