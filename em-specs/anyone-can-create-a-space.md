User Story Review: Anyone in the organization can create a space

# Rule 1: Anyone in the organization can create a space

## Example 1

Bob is a member of the organization "my-organization"

Bob can create a private space in which he is the only member and administrator

## Example 2

Bob is a member of the organization "my-organization"

Bob can create a public space in which he is the only member and administrator

# Rule 2: Space names are unique

## Example 1

Bob has created a space "oddity"

When John tries to create another space "Oddity", he can not create the space as the name is already in use

# Technical rules

- Space name uniqueness is enforced case-insensitively (e.g., `oddity` and `Oddity` collide)
- When a space is created, the creator is automatically set as its only member and administrator
- Space creation is authorized for any organization member (no `OrganizationAdmin` role required) — this replaces the previous behavior where only administrators could create spaces

---

Check also the following rules are applied:

- A space can be created as either private or public
- Name collision detection applies within the scope of the organization
