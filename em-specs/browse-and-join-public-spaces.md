User Story Review: As a member of organization I can browse and join public spaces

# Rule 1: When users browse and search spaces, result contain the Union of 1) spaces she belongs to 2) public spaces (de-duplicated)

## Example 1

Spaces "Security team" and "Devops" are public

Bob browse spaces and search "Sec"

Only space "Security team" is displayed

## Example 2

Spaces "Security team" and "Devops" are public

Bob belong to space "Devops"

When Bob browse space he can see "Security team" and "Devops"

# Rule 2: Members can self-join public spaces

## Example 1 <!-- E2E -->

Spaces "Security team" and "Devops" are public

Joe does not belong to these spaces

He can join them without any approval

## Example 2

Space "secret" is private

Joe does not belong to it

He can't see it nor join it when browsing spaces

# Rule 3: Members in public space can't invite other members

## Example 1

Bob is member of the public space "Security"

He can't add or remove new members in the space

## Example 2

Bob is admin of the public space "Security"

He can add or remove new members in the space

# Rule 4: Members of organizations join spaces with role "member"

## Example 1

Space "Security team" is public and Joe is member of the organization

When Joe joins "Security Team"

He has the role "Member" in the space "Security Team"

# Rule 5: Regarding space visibility, users must be member of two spaces to operates a move operation

## Example 1

John belongs to space "Frontend" but not to public space "React"

He can't move standard "use react forms" from "Frontend" to "React"

# Rule 6: Users need to be in public space to install packages

## Example 1

Bob is member of the space "global" and no other space

In the packmind.json file, the listed packages are:

- @global/generic
- @public-space/package

When Bob runs `packmind install`

The artefacts from @global/generic are updated

The artefacts from @public-space are left untouched

# Rule 7: Spaces visibility can be changed

## Example 1

Alice create a new space

She can set the space as public

## Example 2

Alice is admin of private space "Quality"

She can set it as public

## Example 3

Alice is admin of organization space "MyOrg default space"

She cannot change space visibility (it's public)

## Example 4

Bob is member of private space "Quality"

He cannot change space visibility

# Technical rules

# User Events

- `space_created`: emitted when a space is created. Properties: `visibility` (public | private)
- `space_visibility_updated`: emitted when a space visibility changes. Properties: `newVisibility` (public | locked | private)

---

Check also the following rules are applied:

- A user cannot join a private space by guessing or replaying the join URL: private space "secret" has uuid "1234-abcd", John is not member of "secret", when John runs "curl .../api/space/join/1234-abcd" (he got the URL by analyzing network calls when he joined a public space), he gets an error
- De-duplication: if a user belongs to a public space, it should appear only once in browse results, not twice (once as "my space" and once as "public space")
