---
name: Org-admin override on space-admin use cases
description: Use cases scoped to space admins should let org admins through by short-circuiting executeForMembers to executeForSpaceAdmins when the caller's org membership role is admin
type: feedback
---

# Org-admin override on space-admin use cases

**Domain:** backend / `packages/spaces`, `packages/spaces-management`
**Last confirmed:** 2026-04-29

## When to use

You're writing or extending a use case that:
- Inherits from `AbstractSpaceAdminUseCase` (or otherwise enforces `space-admin` role on the caller).
- Should additionally permit organization admins to perform the action without being a space admin.

## How it works

Override `executeForMembers` in the concrete use case to detect an org-admin caller and delegate to the space-admin path:

```ts
public override async executeForMembers(
  command: TCommand,
): Promise<TResult> {
  if (command.membership.role === 'admin') {
    return this.executeForSpaceAdmins(command);
  }
  return super.executeForMembers(command);
}
```

`command.membership.role` here is the **organization** membership role (set by `AbstractAdminUseCase`/auth pipeline), not the space role. The short-circuit means `executeForSpaceAdmins` runs under the org-admin's authority — the space-admin permission check never fires.

## Canonical examples

All four currently apply the same shape — copy any:
- `packages/spaces-management/src/application/usecases/UpdateSpaceUseCase.ts` (original reference)
- `packages/spaces/src/application/usecases/AddMembersToSpaceUseCase.ts`
- `packages/spaces/src/application/usecases/RemoveMemberFromSpaceUseCase.ts`
- `packages/spaces/src/application/usecases/UpdateMemberRoleUseCase.ts`

## Common mistakes

- **Spec default user factory set to `role: 'admin'`**: the existing "not space admin" tests will pass via the override and stop validating the space-admin gate. When porting the override to a new use case, flip the spec's default user factory to `role: 'member'` and add explicit org-admin tests. See `AddMembersToSpaceUseCase.spec.ts` for the canonical layout.
- **Checking `command.user.role` instead of `command.membership.role`**: `user` is the auth subject, `membership` is the per-org context — only the latter has the org role. Wrong field will silently always be falsy in some auth flows.
- **Adding the override at the abstract level**: don't push this into `AbstractSpaceAdminUseCase` — not every space-admin use case wants org admins to bypass (e.g. some destructive operations may want to require explicit space membership). Keep it per-use-case until that's no longer true.

## Why

Org admins manage all spaces in their org. Forcing them to be space members of every space they administer is friction. The override gives them programmatic access without rewriting space-admin enforcement logic.

## How to apply

When adding a new space-admin use case: ask whether org admins should also be able to call it. If yes, copy the override block from any of the four canonical examples and ensure the spec's default user factory is `role: 'member'`.
