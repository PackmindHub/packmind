User Story Review: As a space administrator I can add members to my space

# Rule 1: Spaces creator get admin role in the space

## Example 1

Aurelien has created a space in his organization

No one sees the newly created space has he added no one to the space

## Example 2

Aurelien has created a space in his organization

He is the space's administrator and can manage space users

## Example 3 <!-- E2E -->

Aurelien has created a space in his organization

He can add any member of the organization to his new space

## Example 4

Aurelien has created a space in his organization

He can remove any member of the space

# Rule 2: Orga admin can view and join all spaces

## Example 1

Jean-Paul is the organization administrator

He can list all the spaces in the organization

## Example 2

Jean-Paul is organization administrator

He can join any space in the organization and gets the role "admin" on the joined space

## Example 3

access to space artefacts is based on the user role in the space, not in the orga

# Rule 3: Only spaces admin can add or remove space members

## Example 1

Aurelien is member of the space "oddity"

He can't add John in the space

## Example 2

Aurelien and John are members of space "oddity"

Aurelien can't remove John from the space

# Rule 4: Only spaces admin can update role members in space

## Example 1

Aurelien and Adrianna are both admins of the space "oddity"

Aurelien can remove the admin role of Adrianna in the space

## Example 2

Aurelien is admin of the space "oddity"

Aurelien can't update its own role in the space

# Rule 5: Artefacts inside a space are only accessible to spaces member

## Example 1

John belongs to space "Frontend" and "Design system"

He can move standard "use react forms" from "Frontend" to "Design system"

## Example 2 <!-- E2E -->

Bob is not a member of space "private"

He can not access any artefact inside the "private" space

## Example 3

John belongs only to space "Frontend"

He cannot move standard "use react forms" from "Frontend" to "design system"

# Rule 6: Users can't be removed from default space

## Example 1

Aurelien is administrator of the organization

He can not remove member from de organization default space

# Rule 7: packmind-cli handles properly space access

## Example 1 <!-- E2E -->

Bob is member of the space "global" and no other space
In the packmind.json file, the listed packages are:
@global/generic
@private-space/secret-package

When Bob runs `packmind install`

The artefacts from @global/generic are updated
The artefacts from @private-space are left untouched

## Example 2

Bob is member of the space "global" and no other space
In the packmind.json file, the listed packages are:
@global/generic
@private-space/secret-package

Bob modifies an artefact in the repo that was deployed with packmind

When Bob runs `packmind playbook add .claude/rules/secret-standard.md`

Bob gets an error saying he can not create changes for artefacts he does not have access to.

## Example 3

Bob is member of the space "global" and no other space
In the packmind.json file, the listed packages are:
@global/generic
@private-space/secret-package

Bob modifies an artefact in the repo that was deployed with packmind

When Bob runs `packmind playbook add .claude/rules/secret-standard.md --space global`

The change is staged as a new standard creation in space "Global"

# Technical rules

- `no "if (isSpaceAdmin() || isOrgaAdmin) {...}"` — access to space artefacts is based on the user role in the space, not in the orga
- New created spaces have type = `SpaceType.private`
- When listing users in the orga when adding users to a space, the email is included in the payload even if the user is not organization's admin

# User Events

- `space_members_added`: emitted when a member is added to a space. Properties: `TBD`
- `space_members_removed`: emitted when a member is removed from a space. Properties: `TBD`
- `space_members_role_updated`: emitted when a member's role is updated in a space. Properties: `TBD`

---

Check also the following rules are applied:

- Rule 5 Examples 1 and 3 are linked on the board (arrow between them) as a positive/negative pair: a member of both spaces can move a standard between them, but a member of only one space cannot.
