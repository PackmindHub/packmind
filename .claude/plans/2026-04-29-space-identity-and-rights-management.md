# Space Identity and Rights Management (Org Admin Drawer) Implementation Plan

> **For agentic execution:** Use `packmind:architect-executor` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a side drawer to `/org/:orgSlug/settings/spaces` that lets an org admin manage a space's identity (name + color), members (add / remove / change role), and deletion via three tabs (General / Members / Danger), without leaving the listing.

**Architecture:** Backend gains a small authz extension — three space-membership use cases get the same org-admin short-circuit `UpdateSpaceUseCase` already has. Frontend lifts data dependencies out of two existing section components so the drawer can compose them, and adds one new `SpaceManagementDrawer` container plus row-click wiring on the listing table.

**Tech Stack:** NestJS use cases (`AbstractSpaceAdminUseCase`), TypeORM unchanged, React + Chakra (`PMDrawer`, `PMTabs`), TanStack Query mutations and invalidations.

**Source Spec:** `.claude/specs/2026-04-29-space-identity-and-rights-management-design.md`
**EM Spec:** None (fresh idea)
**Docs consulted:**
- `.claude/docs/domain-map.md`
- `.claude/docs/discoveries/2026-04-28-session-orga-space-management.md`
- `.claude/docs/patterns/frontend/pmtable-jest-mock.md`
- `.claude/specs/2026-04-27-orga-space-management-design.md`

---

## Task 1: Extend `AddMembersToSpaceUseCase` to allow org admins

**Files:**
- Modify: `packages/spaces/src/application/usecases/AddMembersToSpaceUseCase.ts`
- Modify: `packages/spaces/src/application/usecases/AddMembersToSpaceUseCase.spec.ts`

- [ ] **Step 1: Add the org-admin override**

In `AddMembersToSpaceUseCase.ts`, add `executeForMembers` override above `executeForSpaceAdmins`. Import `MemberContext` from `@packmind/node-utils`. Final shape:

```ts
import {
  AbstractSpaceAdminUseCase,
  MemberContext,
  PackmindEventEmitterService,
  SpaceAdminContext,
} from '@packmind/node-utils';

// ...inside class AddMembersToSpaceUseCase:

protected override async executeForMembers(
  command: AddMembersToSpaceCommand & MemberContext,
): Promise<AddMembersToSpaceResponse> {
  if (command.membership.role === 'admin') {
    return this.executeForSpaceAdmins(command);
  }
  return super.executeForMembers(command);
}
```

The existing `executeForSpaceAdmins` body stays untouched.

- [ ] **Step 2: Add a test for org-admin success path**

In `AddMembersToSpaceUseCase.spec.ts`, add a new `describe('when caller is an org admin without space admin role', () => { ... })` block. Pattern is copied from `UpdateSpaceUseCase.spec.ts:396` (search "when caller is an org admin without space admin role"). The block sets `accountsPort.getUserById.mockResolvedValue(orgAdmin)` where `orgAdmin` has `memberships: [{ userId, organizationId, role: 'admin' }]`. The use case must succeed (return created memberships) and emit `SpaceMembersAddedEvent` with the org admin's `userId`. Also add an assertion that `spacesPort.findMembership` is NOT called for the caller (the override skips it).

```ts
describe('when caller is an org admin without space admin role', () => {
  beforeEach(() => {
    const orgAdmin = userFactory({
      id: userId,
      memberships: [{ userId, organizationId, role: 'admin' }],
    });
    accountsPort.getUserById.mockResolvedValue(orgAdmin);
    membershipService.addSpaceMembership.mockResolvedValue(
      userSpaceMembershipFactory({
        userId: targetUserId,
        spaceId,
        role: UserSpaceRole.MEMBER,
      }),
    );
  });

  it('adds members without checking space-admin membership', async () => {
    const result = await useCase.execute(
      buildCommand({
        members: [{ userId: targetUserId, role: UserSpaceRole.MEMBER }],
      }),
    );

    expect(result).toHaveLength(1);
    expect(eventEmitterService.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        organizationId,
        spaceId,
      }),
    );
    expect(spacesPort.findMembership).not.toHaveBeenCalled();
  });
});
```

Adapt the imports/factory calls to match the existing spec file structure (the spec already imports `userFactory`, `userSpaceMembershipFactory`, etc.).

- [ ] **Step 3: Run tests; expected: pass**

Run: `./node_modules/.bin/nx test spaces --testFile=AddMembersToSpaceUseCase.spec.ts`
Expected: all tests (existing + new) pass.

- [ ] **Step 4: Lint**

Run: `./node_modules/.bin/nx lint spaces`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/spaces/src/application/usecases/AddMembersToSpaceUseCase.ts \
        packages/spaces/src/application/usecases/AddMembersToSpaceUseCase.spec.ts
git commit -m ":sparkles: feat(spaces): allow org admins to add members to any space"
```

---

## Task 2: Extend `RemoveMemberFromSpaceUseCase` to allow org admins

**Files:**
- Modify: `packages/spaces/src/application/usecases/RemoveMemberFromSpaceUseCase.ts`
- Modify: `packages/spaces/src/application/usecases/RemoveMemberFromSpaceUseCase.spec.ts`

- [ ] **Step 1: Add the org-admin override**

In `RemoveMemberFromSpaceUseCase.ts`, import `MemberContext` and add the override:

```ts
protected override async executeForMembers(
  command: RemoveMemberFromSpaceCommand & MemberContext,
): Promise<RemoveMemberFromSpaceResponse> {
  if (command.membership.role === 'admin') {
    return this.executeForSpaceAdmins(command);
  }
  return super.executeForMembers(command);
}
```

The existing `executeForSpaceAdmins` body stays untouched. Note: `CannotRemoveFromDefaultSpaceError` and `CannotRemoveSelfError` are still raised inside `executeForSpaceAdmins` so they continue to apply to org admins.

- [ ] **Step 2: Add tests for org-admin paths**

In `RemoveMemberFromSpaceUseCase.spec.ts`, add a new describe block:

```ts
describe('when caller is an org admin without space admin role', () => {
  beforeEach(() => {
    const orgAdmin = userFactory({
      id: userId,
      memberships: [{ userId, organizationId, role: 'admin' }],
    });
    accountsPort.getUserById.mockResolvedValue(orgAdmin);
    membershipService.getSpaceById.mockResolvedValue(
      spaceFactory({ id: spaceId, isDefaultSpace: false }),
    );
    membershipService.removeSpaceMembership.mockResolvedValue(true);
  });

  it('removes a member without checking space-admin membership', async () => {
    const result = await useCase.execute(buildCommand());

    expect(result).toEqual({ removed: true });
    expect(eventEmitterService.emit).toHaveBeenCalled();
    expect(spacesPort.findMembership).not.toHaveBeenCalled();
  });

  it('still rejects removal from the default space', async () => {
    membershipService.getSpaceById.mockResolvedValue(
      spaceFactory({ id: spaceId, isDefaultSpace: true }),
    );

    await expect(useCase.execute(buildCommand())).rejects.toBeInstanceOf(
      CannotRemoveFromDefaultSpaceError,
    );
  });

  it('still rejects self-removal', async () => {
    await expect(
      useCase.execute(buildCommand({ targetUserId: userId })),
    ).rejects.toBeInstanceOf(CannotRemoveSelfError);
  });
});
```

Imports needed: `spaceFactory` from `@packmind/spaces/test/spaceFactory`; `CannotRemoveFromDefaultSpaceError` and `CannotRemoveSelfError` from the local `domain/errors` (existing imports in the spec).

- [ ] **Step 3: Run tests; expected: pass**

Run: `./node_modules/.bin/nx test spaces --testFile=RemoveMemberFromSpaceUseCase.spec.ts`
Expected: all tests pass.

- [ ] **Step 4: Lint**

Run: `./node_modules/.bin/nx lint spaces`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/spaces/src/application/usecases/RemoveMemberFromSpaceUseCase.ts \
        packages/spaces/src/application/usecases/RemoveMemberFromSpaceUseCase.spec.ts
git commit -m ":sparkles: feat(spaces): allow org admins to remove members from any space"
```

---

## Task 3: Extend `UpdateMemberRoleUseCase` to allow org admins

**Files:**
- Modify: `packages/spaces/src/application/usecases/UpdateMemberRoleUseCase.ts`
- Modify: `packages/spaces/src/application/usecases/UpdateMemberRoleUseCase.spec.ts`

- [ ] **Step 1: Add the org-admin override**

In `UpdateMemberRoleUseCase.ts`, import `MemberContext` and add the override:

```ts
protected override async executeForMembers(
  command: UpdateMemberRoleCommand & MemberContext,
): Promise<UpdateMemberRoleResponse> {
  if (command.membership.role === 'admin') {
    return this.executeForSpaceAdmins(command);
  }
  return super.executeForMembers(command);
}
```

The existing `executeForSpaceAdmins` body is untouched. `CannotUpdateOwnRoleError` and `MemberNotFoundError` continue to be raised inside, so they still apply to org admins.

- [ ] **Step 2: Add tests for org-admin paths**

In `UpdateMemberRoleUseCase.spec.ts`, add a new describe block:

```ts
describe('when caller is an org admin without space admin role', () => {
  beforeEach(() => {
    const orgAdmin = userFactory({
      id: userId,
      memberships: [{ userId, organizationId, role: 'admin' }],
    });
    accountsPort.getUserById.mockResolvedValue(orgAdmin);
    membershipService.findMembership.mockResolvedValue(
      userSpaceMembershipFactory({
        userId: targetUserId,
        spaceId,
        role: UserSpaceRole.MEMBER,
      }),
    );
    membershipService.updateMembershipRole.mockResolvedValue(true);
  });

  it('updates a member role without checking space-admin membership', async () => {
    const result = await useCase.execute(
      buildCommand({ role: UserSpaceRole.ADMIN }),
    );

    expect(result).toEqual({ updated: true });
    expect(eventEmitterService.emit).toHaveBeenCalled();
    expect(spacesPort.findMembership).not.toHaveBeenCalled();
  });

  it('still rejects self-role-update', async () => {
    await expect(
      useCase.execute(buildCommand({ targetUserId: userId })),
    ).rejects.toBeInstanceOf(CannotUpdateOwnRoleError);
  });

  it('still rejects when target is not a member', async () => {
    membershipService.findMembership.mockResolvedValue(null);

    await expect(useCase.execute(buildCommand())).rejects.toBeInstanceOf(
      MemberNotFoundError,
    );
  });
});
```

- [ ] **Step 3: Run tests; expected: pass**

Run: `./node_modules/.bin/nx test spaces --testFile=UpdateMemberRoleUseCase.spec.ts`
Expected: all tests pass.

- [ ] **Step 4: Lint**

Run: `./node_modules/.bin/nx lint spaces`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/spaces/src/application/usecases/UpdateMemberRoleUseCase.ts \
        packages/spaces/src/application/usecases/UpdateMemberRoleUseCase.spec.ts
git commit -m ":sparkles: feat(spaces): allow org admins to change any member's role"
```

---

## Task 4: Extend `members.controller.spec.ts` with org-admin coverage

**Files:**
- Modify: `apps/api/src/app/organizations/spaces/members/members.controller.spec.ts`

- [ ] **Step 1: Read the existing controller spec**

Use `Read` on `apps/api/src/app/organizations/spaces/members/members.controller.spec.ts` to understand the existing test structure. The test should be unit-style (direct controller method calls + assert on rejections), following the convention documented in `.claude/docs/discoveries/2026-04-28-session-orga-space-management.md` item 5.

- [ ] **Step 2: Add three smoke tests confirming the controller doesn't reject org-admin callers**

Add tests that mock `membersService.addMembersToSpace`, `removeMemberFromSpace`, and `updateMemberRole` to resolve successfully and confirm no exception is thrown. These are smoke checks — the underlying authz logic is fully covered by the use-case specs in tasks 1-3.

```ts
describe('when caller is an org admin (not a space member)', () => {
  it('addMembers succeeds', async () => {
    membersService.addMembersToSpace.mockResolvedValue([]);

    await expect(
      controller.addMembers(orgId, spaceId, { members: [] }, request),
    ).resolves.toEqual([]);
  });

  it('removeMember succeeds', async () => {
    membersService.removeMemberFromSpace.mockResolvedValue({ removed: true });

    await expect(
      controller.removeMember(orgId, spaceId, targetUserId, request),
    ).resolves.toEqual({ removed: true });
  });

  it('updateMemberRole succeeds', async () => {
    membersService.updateMemberRole.mockResolvedValue({ updated: true });

    await expect(
      controller.updateMemberRole(
        orgId,
        spaceId,
        targetUserId,
        { role: 'admin' },
        request,
      ),
    ).resolves.toEqual({ updated: true });
  });
});
```

Adapt mock variable names (`membersService`, `controller`, `orgId`, `spaceId`, `targetUserId`, `request`) to match the existing test file's local names.

- [ ] **Step 3: Run tests; expected: pass**

Run: `./node_modules/.bin/nx test api --testFile=members.controller.spec.ts`
Expected: all tests pass.

- [ ] **Step 4: Lint**

Run: `./node_modules/.bin/nx lint api`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app/organizations/spaces/members/members.controller.spec.ts
git commit -m ":white_check_mark: test(api): cover org-admin paths in members controller"
```

---

## Task 5: Refactor `SpaceMembersList` to be prop-driven

**Files:**
- Modify: `apps/frontend/src/domain/spaces/components/SpaceMembersList.tsx`
- Modify: `apps/frontend/src/domain/spaces/components/SpaceMembersList.test.tsx`

- [ ] **Step 1: Refactor the component**

Change the props from implicit (via `useCurrentSpace`) to explicit. New signature:

```tsx
import { Space } from '@packmind/types';

interface SpaceMembersListProps {
  space: Space;
  isSpaceAdmin: boolean;
}

export function SpaceMembersList({
  space,
  isSpaceAdmin,
}: Readonly<SpaceMembersListProps>) {
  const { user } = useAuthContext();
  const currentUserId = user?.id;
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<SpaceMember | null>(
    null,
  );

  const { data, isLoading } = useGetSpaceMembersQuery(space.id);
  const removeMutation = useRemoveMemberFromSpaceMutation(space.id);
  const updateRoleMutation = useUpdateMemberRoleMutation(space.id);

  // ...rest of the existing body, replacing `spaceId ?? ''` with `space.id`
  // and replacing `space?.isDefaultSpace` with `space.isDefaultSpace`
}
```

Remove the `useCurrentSpace` import. Replace internal usages of `spaceId` and `space` with the new prop-derived values. Drop the local `isSpaceAdmin` derivation — use the prop instead.

- [ ] **Step 2: Update the test file**

Existing test cases assume the component pulls from `useCurrentSpace`. Update each render call to pass `space` and `isSpaceAdmin` as props:

```tsx
const space = spaceFactory({ id: createSpaceId('s-1'), isDefaultSpace: false });

render(<SpaceMembersList space={space} isSpaceAdmin={true} />, { wrapper });
```

Use `spaceFactory` from `@packmind/spaces/test/spaceFactory`. Add a new test case:

```tsx
it('when isSpaceAdmin is false, hides the Add button and disables remove/role controls', () => {
  // setup query mock to return at least one non-current member
  render(<SpaceMembersList space={space} isSpaceAdmin={false} />, { wrapper });

  expect(screen.queryByRole('button', { name: /add members/i })).toBeNull();
  // role select should be disabled — depends on PMNativeSelect's disabled rendering
});
```

If the existing test mocks `useCurrentSpace`, remove that mock entirely. If it mocks `useGetSpaceMembersQuery`, keep that. PMTable mock is required if `SpaceMembersTable` is rendered — see `.claude/docs/patterns/frontend/pmtable-jest-mock.md`.

- [ ] **Step 3: Run tests; expected: pass**

Run: `./node_modules/.bin/nx test frontend --testFile=SpaceMembersList.test.tsx`
Expected: all tests pass.

- [ ] **Step 4: Lint**

Run: `./node_modules/.bin/nx lint frontend`
Expected: no errors. (Note: typecheck may break in callers — they are fixed in Task 8.)

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/domain/spaces/components/SpaceMembersList.tsx \
        apps/frontend/src/domain/spaces/components/SpaceMembersList.test.tsx
git commit -m ":art: refactor(spaces): make SpaceMembersList prop-driven"
```

---

## Task 6: Refactor `SpaceDangerZoneSection` to be prop-driven

**Files:**
- Modify: `apps/frontend/src/domain/spaces/components/SpaceDangerZoneSection.tsx`
- Modify: `apps/frontend/src/domain/spaces/components/SpaceDangerZoneSection.test.tsx`

- [ ] **Step 1: Read the existing component to confirm the current API**

Use `Read` on `apps/frontend/src/domain/spaces/components/SpaceDangerZoneSection.tsx`. Today it likely calls `useCurrentSpace()` and `useDeleteSpaceMutation()` and redirects on success. Confirm this before refactoring.

- [ ] **Step 2: Refactor the component**

New signature:

```tsx
import { Space } from '@packmind/types';

interface SpaceDangerZoneSectionProps {
  space: Space;
  canDelete: boolean;
  onDeleted?: () => void;
}

export function SpaceDangerZoneSection({
  space,
  canDelete,
  onDeleted,
}: Readonly<SpaceDangerZoneSectionProps>) {
  // existing local state for the confirmation dialog open/close
  const deleteMutation = useDeleteSpaceMutation();
  const navigate = useNavigate();

  const handleConfirm = async () => {
    try {
      await deleteMutation.mutateAsync({ spaceId: space.id });
      pmToaster.create({ type: 'success', title: 'Space deleted' });
      if (onDeleted) {
        onDeleted();
      } else {
        // existing default redirect (preserve whatever path was there)
      }
    } catch (err) {
      // existing error toaster
    }
  };

  // ...rest of the existing JSX, with `canDelete` gating the button
}
```

Replace the original `useCurrentSpace` usage with `space` prop. The `canDelete` prop replaces whatever the previous internal derivation was. The `onDeleted` callback replaces the default redirect when provided.

- [ ] **Step 3: Update the test file**

Render with the new props:

```tsx
const space = spaceFactory({ id: createSpaceId('s-1'), isDefaultSpace: false });

it('renders delete button when canDelete is true', () => {
  render(<SpaceDangerZoneSection space={space} canDelete={true} />, { wrapper });
  expect(screen.getByRole('button', { name: /delete/i })).toBeEnabled();
});

it('disables delete button when canDelete is false', () => {
  render(<SpaceDangerZoneSection space={space} canDelete={false} />, { wrapper });
  expect(screen.queryByRole('button', { name: /delete/i })).toBeDisabled();
});

it('calls onDeleted instead of redirecting when provided', async () => {
  const onDeleted = jest.fn();
  // mock the delete mutation to resolve
  render(
    <SpaceDangerZoneSection space={space} canDelete={true} onDeleted={onDeleted} />,
    { wrapper },
  );
  // simulate confirm flow → assert onDeleted called and navigate NOT called
  expect(onDeleted).toHaveBeenCalled();
});
```

Remove any `useCurrentSpace` mock. Mock `useDeleteSpaceMutation` and `useNavigate` per existing patterns in the test file.

- [ ] **Step 4: Run tests; expected: pass**

Run: `./node_modules/.bin/nx test frontend --testFile=SpaceDangerZoneSection.test.tsx`
Expected: all tests pass.

- [ ] **Step 5: Lint**

Run: `./node_modules/.bin/nx lint frontend`
Expected: no errors. (Caller `SpaceGeneralSettings` will typecheck-fail until Task 7.)

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/domain/spaces/components/SpaceDangerZoneSection.tsx \
        apps/frontend/src/domain/spaces/components/SpaceDangerZoneSection.test.tsx
git commit -m ":art: refactor(spaces): make SpaceDangerZoneSection prop-driven"
```

---

## Task 7: Adapt `SpaceGeneralSettings` to pass `space` to `SpaceDangerZoneSection`

**Files:**
- Modify: `apps/frontend/src/domain/spaces/components/SpaceGeneralSettings.tsx`

- [ ] **Step 1: Update the call site**

In `SpaceGeneralSettings.tsx`, the existing line `<SpaceDangerZoneSection canDeleteSpace={canDeleteSpace} />` becomes:

```tsx
{!space?.isDefaultSpace && space && (
  <SpaceDangerZoneSection space={space} canDelete={canDeleteSpace} />
)}
```

(Adapt to whatever the existing exact JSX is; the only changes are: pass `space` prop and rename `canDeleteSpace` prop to `canDelete`.) Keep the rest of the file unchanged. The component already has `space` available from `useCurrentSpace`.

- [ ] **Step 2: Run frontend typecheck**

Run: `./node_modules/.bin/nx typecheck frontend`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `./node_modules/.bin/nx lint frontend`
Expected: no errors.

- [ ] **Step 4: Run frontend tests for the per-space settings tree**

Run: `./node_modules/.bin/nx test frontend --testPathPattern="(SpaceGeneralSettings|SpaceSettingsPage)"`
Expected: any existing tests pass (none may exist for these — that's OK).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/domain/spaces/components/SpaceGeneralSettings.tsx
git commit -m ":art: refactor(spaces): pass space prop to SpaceDangerZoneSection"
```

---

## Task 8: Adapt `SpaceSettingsPage` to pass `space` and `isSpaceAdmin` to `SpaceMembersList`

**Files:**
- Modify: `apps/frontend/src/domain/spaces/components/SpaceSettingsPage.tsx`

- [ ] **Step 1: Update the page to pass props down**

`SpaceSettingsPage.tsx` currently renders `<SpaceMembersList />` with no props. Update it to fetch `space` via `useCurrentSpace` and `isSpaceAdmin` via the existing pattern:

```tsx
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../hooks/useCurrentSpace';
import { useGetSpaceMembersQuery } from '../api/queries/SpacesQueries';

export function SpaceSettingsPage() {
  const { space, spaceId } = useCurrentSpace();
  const { user } = useAuthContext();
  const { data: membersData } = useGetSpaceMembersQuery(spaceId ?? '');

  const isSpaceAdmin =
    membersData?.members?.find((m) => m.userId === user?.id)?.role === 'admin';

  const tabs = [
    {
      value: 'general',
      triggerLabel: 'General',
      content: <SpaceGeneralSettings />,
    },
    {
      value: 'members',
      triggerLabel: 'Members',
      content: (
        <PMVStack align="stretch" pt={4}>
          {space && (
            <SpaceMembersList space={space} isSpaceAdmin={isSpaceAdmin} />
          )}
        </PMVStack>
      ),
    },
  ];

  return (
    <PMPage title="Space settings">
      <PMTabs defaultValue={tabs[0]?.value ?? 'members'} tabs={tabs} />
    </PMPage>
  );
}
```

- [ ] **Step 2: Run frontend typecheck**

Run: `./node_modules/.bin/nx typecheck frontend`
Expected: no errors. After this task the existing per-space settings tree compiles end-to-end.

- [ ] **Step 3: Lint**

Run: `./node_modules/.bin/nx lint frontend`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/domain/spaces/components/SpaceSettingsPage.tsx
git commit -m ":art: refactor(spaces): pass space and isSpaceAdmin to SpaceMembersList"
```

---

## Task 9: Add `SpaceManagementDrawer` component

**Files:**
- Create: `apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpaceManagementDrawer.tsx`
- Create: `apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpaceManagementDrawer.test.tsx`

- [ ] **Step 1: Implement the drawer container**

```tsx
import { useMemo, useState } from 'react';
import {
  PMBox,
  PMCloseButton,
  PMDrawer,
  PMHeading,
  PMHStack,
  PMPortal,
  PMStatus,
  PMTabs,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { useQueryClient } from '@tanstack/react-query';
import { Space } from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useGetSpaceMembersQuery } from '../../api/queries/SpacesQueries';
import { SpaceIdentitySection } from '../SpaceIdentitySection';
import { SpaceMembersList } from '../SpaceMembersList';
import { SpaceDangerZoneSection } from '../SpaceDangerZoneSection';
import { SpaceManagementListItem } from './types';

type DrawerTab = 'general' | 'members' | 'danger';

interface SpaceManagementDrawerProps {
  space: SpaceManagementListItem | null;
  onClose: () => void;
}

export function SpaceManagementDrawer({
  space,
  onClose,
}: Readonly<SpaceManagementDrawerProps>) {
  const queryClient = useQueryClient();
  const { user, organization } = useAuthContext();
  const [activeTab, setActiveTab] = useState<DrawerTab>('general');

  const { data: membersData } = useGetSpaceMembersQuery(space?.id ?? '');

  const currentUserMember = membersData?.members?.find(
    (m) => m.userId === user?.id,
  );
  const isSpaceAdmin = currentUserMember?.role === 'admin';
  const isOrgAdmin = organization?.role === 'admin';
  const canEdit = isSpaceAdmin || isOrgAdmin;
  const canDelete = isSpaceAdmin || isOrgAdmin;

  const handleDeleted = () => {
    if (organization?.id) {
      queryClient.invalidateQueries({
        queryKey: ['organizations', organization.id, 'spaces', 'management'],
      });
    }
    onClose();
  };

  const tabs = useMemo(() => {
    if (!space) return [];
    const base = [
      {
        value: 'general' as const,
        triggerLabel: 'General',
        content: <SpaceIdentitySection space={space} canEdit={canEdit} />,
      },
      {
        value: 'members' as const,
        triggerLabel: 'Members',
        content: (
          <PMVStack align="stretch" pt={4}>
            <SpaceMembersList space={space} isSpaceAdmin={canEdit} />
          </PMVStack>
        ),
      },
    ];
    if (!space.isDefaultSpace) {
      base.push({
        value: 'danger' as const,
        triggerLabel: 'Danger',
        content: (
          <SpaceDangerZoneSection
            space={space}
            canDelete={canDelete}
            onDeleted={handleDeleted}
          />
        ),
      });
    }
    return base;
  }, [space, canEdit, canDelete, handleDeleted]);

  return (
    <PMDrawer.Root
      open={!!space}
      onOpenChange={(e) => {
        if (!e.open) {
          setActiveTab('general');
          onClose();
        }
      }}
      placement="end"
      size="md"
    >
      <PMPortal>
        <PMDrawer.Backdrop />
        <PMDrawer.Positioner>
          <PMDrawer.Content>
            {space && (
              <>
                <PMDrawer.Header>
                  <PMHStack gap={3} align="center" flex={1}>
                    <PMVStack gap={0.5} align="start" flex={1} minW={0}>
                      <PMHStack gap={2} align="center">
                        <PMStatus.Root as="span">
                          <PMStatus.Indicator
                            colorPalette={space.color}
                          />
                        </PMStatus.Root>
                        <PMHeading size="md">{space.name}</PMHeading>
                      </PMHStack>
                      <PMText fontSize="xs" color="faded">
                        {space.membersCount} member
                        {space.membersCount === 1 ? '' : 's'} ·{' '}
                        {space.artifactsCount} artifact
                        {space.artifactsCount === 1 ? '' : 's'}
                      </PMText>
                    </PMVStack>
                  </PMHStack>
                </PMDrawer.Header>
                <PMDrawer.Body padding={5}>
                  <PMTabs
                    value={activeTab}
                    onValueChange={({ value }) =>
                      setActiveTab(value as DrawerTab)
                    }
                    tabs={tabs}
                  />
                </PMDrawer.Body>
                <PMDrawer.CloseTrigger asChild>
                  <PMCloseButton size="sm" />
                </PMDrawer.CloseTrigger>
              </>
            )}
          </PMDrawer.Content>
        </PMDrawer.Positioner>
      </PMPortal>
    </PMDrawer.Root>
  );
}
```

If `PMTabs` exposes a different controlled-value prop than `value`/`onValueChange`, adapt — examine an existing controlled `PMTabs` usage (search `apps/frontend/src` for `PMTabs`). The status indicator color is the SpaceColor token (`red | orange | … | pink`). Adjust the `colorPalette` prop name if PMStatus.Indicator uses something different — check an existing usage in `apps/frontend/src/domain/spaces/components/SpaceIdentitySection.tsx` or the playground prototype.

- [ ] **Step 2: Write tests**

```tsx
import { render, screen } from '@testing-library/react';
import { SpaceManagementDrawer } from './SpaceManagementDrawer';
// ...wrapper with QueryClientProvider, AuthContext mock, etc.

// PMTable mock per .claude/docs/patterns/frontend/pmtable-jest-mock.md

describe('SpaceManagementDrawer', () => {
  const space = makeSpaceManagementListItem({ isDefaultSpace: false });
  const defaultSpace = makeSpaceManagementListItem({ isDefaultSpace: true });

  it('does not render when space is null', () => {
    render(<SpaceManagementDrawer space={null} onClose={jest.fn()} />, { wrapper });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders three tabs for a non-default space', () => {
    render(<SpaceManagementDrawer space={space} onClose={jest.fn()} />, { wrapper });
    expect(screen.getByRole('tab', { name: /general/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /members/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /danger/i })).toBeInTheDocument();
  });

  it('omits the Danger tab for the default space', () => {
    render(<SpaceManagementDrawer space={defaultSpace} onClose={jest.fn()} />, { wrapper });
    expect(screen.queryByRole('tab', { name: /danger/i })).toBeNull();
  });

  it('renders the header subtitle with member and artifact counts', () => {
    const s = makeSpaceManagementListItem({
      membersCount: 5,
      artifactsCount: 12,
      isDefaultSpace: false,
    });
    render(<SpaceManagementDrawer space={s} onClose={jest.fn()} />, { wrapper });
    expect(screen.getByText(/5 members/)).toBeInTheDocument();
    expect(screen.getByText(/12 artifacts/)).toBeInTheDocument();
  });

  it('calls onClose when the drawer requests close', () => {
    const onClose = jest.fn();
    render(<SpaceManagementDrawer space={space} onClose={onClose} />, { wrapper });
    // Trigger onOpenChange with open=false — adapt to PMDrawer's actual API
    // e.g. fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled();
  });
});

function makeSpaceManagementListItem(
  overrides: Partial<SpaceManagementListItem> = {},
): SpaceManagementListItem {
  return {
    id: createSpaceId('s-1'),
    name: 'Frontend',
    slug: 'frontend',
    color: 'orange',
    type: SpaceType.open,
    organizationId: createOrganizationId('org-1'),
    isDefaultSpace: false,
    admins: [],
    membersCount: 3,
    artifactsCount: 7,
    createdAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}
```

Mock `useGetSpaceMembersQuery` to return a stable response. Mock `useAuthContext` to set `organization.role`. The PMTable mock from the pattern doc is required because `SpaceMembersTable` is rendered inside `SpaceMembersList`.

- [ ] **Step 3: Run tests; expected: pass**

Run: `./node_modules/.bin/nx test frontend --testFile=SpaceManagementDrawer.test.tsx`
Expected: all tests pass.

- [ ] **Step 4: Lint**

Run: `./node_modules/.bin/nx lint frontend`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpaceManagementDrawer.tsx \
        apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpaceManagementDrawer.test.tsx
git commit -m ":sparkles: feat(frontend): add SpaceManagementDrawer for org-admin space management"
```

---

## Task 10: Wire row click in `SpacesTable`

**Files:**
- Modify: `apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesTable.tsx`
- Modify: `apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesTable.test.tsx`

- [ ] **Step 1: Add `onSelectSpace` callback and wire it**

Add a new prop:

```tsx
interface SpacesTableProps {
  spaces: SpaceListItem[];
  // ...existing props
  onSelectSpace?: (space: SpaceListItem) => void;
}
```

Inside the row rendering, attach a click handler that calls `onSelectSpace(space)` only when the click target is the row body (not a button or interactive element):

```tsx
<PMTableRow
  // ...existing props
  onClick={(e) => {
    const target = e.target as HTMLElement;
    // Skip clicks on interactive elements
    if (target.closest('button, a, input, [role="menu"], [role="menuitem"]')) {
      return;
    }
    onSelectSpace?.(space);
  }}
  cursor={onSelectSpace ? 'pointer' : 'default'}
/>
```

If `PMTableRow` doesn't accept an `onClick` prop directly, wrap each cell content in a clickable container, or use a different pattern. Read `PMTable` source or an existing row-clickable example before deciding. The existing kebab menu (`SpaceRowActions`) must continue to work — its buttons are wrapped in `<button>` so the closest-check will skip them.

- [ ] **Step 2: Update tests**

```tsx
it('calls onSelectSpace when a row body is clicked', async () => {
  const onSelectSpace = jest.fn();
  render(
    <SpacesTable
      spaces={[mockSpace]}
      onSelectSpace={onSelectSpace}
      /* ...other required props */
    />,
    { wrapper },
  );

  await userEvent.click(screen.getByText(mockSpace.name));

  expect(onSelectSpace).toHaveBeenCalledWith(mockSpace);
});

it('does not call onSelectSpace when a row action button is clicked', async () => {
  const onSelectSpace = jest.fn();
  render(
    <SpacesTable
      spaces={[mockSpace]}
      onSelectSpace={onSelectSpace}
      /* ...other required props */
    />,
    { wrapper },
  );

  await userEvent.click(screen.getByRole('button', { name: /more actions/i }));

  expect(onSelectSpace).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Run tests; expected: pass**

Run: `./node_modules/.bin/nx test frontend --testFile=SpacesTable.test.tsx`
Expected: all tests pass.

- [ ] **Step 4: Lint**

Run: `./node_modules/.bin/nx lint frontend`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesTable.tsx \
        apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesTable.test.tsx
git commit -m ":sparkles: feat(frontend): support row click on SpacesTable to open drawer"
```

---

## Task 11: Open the drawer from `SpacesManagementPage`

**Files:**
- Modify: `apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesManagementPage.tsx`
- Modify: `apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesManagementPage.test.tsx`

- [ ] **Step 1: Add drawer state and render the drawer**

In `SpacesManagementPage.tsx`:

```tsx
import { useState } from 'react';
import { SpaceManagementDrawer } from './SpaceManagementDrawer';
import { SpaceManagementListItem } from './types';

// ...inside the component:
const [selectedSpace, setSelectedSpace] = useState<SpaceManagementListItem | null>(null);

// ...inside the JSX (after the table + pagination):
<SpaceManagementDrawer
  space={selectedSpace}
  onClose={() => setSelectedSpace(null)}
/>

// And on the table:
<SpacesTable
  /* existing props */
  onSelectSpace={(s) => setSelectedSpace(toSpaceManagementListItem(s))}
/>
```

The `SpacesTable` deals in `SpaceListItem` (the page's local view-model). The drawer deals in `SpaceManagementListItem` (the gateway response shape — a `Space`-extension with admins/counts/createdAt). If `SpaceListItem` already carries those fields, the conversion is a cast or identity; otherwise pass through the raw `data.items[i]` from the query (which is already `SpaceManagementListItem`). Pick whichever pattern aligns with existing code — read `toSpaceListItem.ts` first.

- [ ] **Step 2: Update tests**

```tsx
it('opens the drawer when a row is clicked', async () => {
  // existing query mock returns at least one space
  render(<SpacesManagementPage />, { wrapper });

  await userEvent.click(screen.getByText('Frontend')); // adjust to the seeded space name

  expect(screen.getByRole('dialog', { name: /frontend/i })).toBeInTheDocument();
});

it('closes the drawer on close', async () => {
  render(<SpacesManagementPage />, { wrapper });
  await userEvent.click(screen.getByText('Frontend'));
  await userEvent.click(screen.getByRole('button', { name: /close/i }));

  expect(screen.queryByRole('dialog')).toBeNull();
});
```

PMTable mock + drawer-related mocks per the pattern doc.

- [ ] **Step 3: Run tests; expected: pass**

Run: `./node_modules/.bin/nx test frontend --testFile=SpacesManagementPage.test.tsx`
Expected: all tests pass.

- [ ] **Step 4: Run a broader frontend test sweep**

Run: `./node_modules/.bin/nx test frontend --testPathPattern="(Space|spaces)"`
Expected: all tests pass — confirms no regression in the surrounding tree.

- [ ] **Step 5: Lint and typecheck**

Run: `./node_modules/.bin/nx lint frontend && ./node_modules/.bin/nx typecheck frontend`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesManagementPage.tsx \
        apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesManagementPage.test.tsx
git commit -m ":sparkles: feat(frontend): wire SpaceManagementDrawer into spaces management page"
```

---

## Task 12: Listing-key invalidation on identity update

**Files:**
- Modify: `apps/frontend/src/domain/spaces/components/SpaceIdentitySection.tsx`

- [ ] **Step 1: Invalidate the management listing on save**

`SpaceIdentitySection` currently only calls `useUpdateSpaceMutation`. The mutation invalidates singular space keys but not the plural management listing (per the discoveries doc, item 7). When the section is rendered inside the drawer and the user changes name or color, the listing row in the background still shows stale data.

Add an explicit invalidation in the success branch:

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';

// ...inside the component:
const queryClient = useQueryClient();
const { organization } = useAuthContext();

// ...in handleSave's try block, after the success toaster:
if (organization?.id) {
  queryClient.invalidateQueries({
    queryKey: ['organizations', organization.id, 'spaces', 'management'],
  });
}
```

This is safe in both contexts (drawer and per-space settings page) — invalidating a key that has no cached data is a no-op.

- [ ] **Step 2: Add a test for the invalidation**

If `SpaceIdentitySection.test.tsx` doesn't exist yet, create one. Otherwise extend:

```tsx
it('invalidates the management listing key on successful update', async () => {
  const queryClient = new QueryClient();
  const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

  render(<SpaceIdentitySection space={space} canEdit={true} />, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    ),
  });

  // change the name → click Save → wait for the mutation to resolve
  // mock useUpdateSpaceMutation to resolve successfully

  expect(invalidateSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      queryKey: expect.arrayContaining(['organizations']),
    }),
  );
});
```

- [ ] **Step 3: Run tests; expected: pass**

Run: `./node_modules/.bin/nx test frontend --testPathPattern="SpaceIdentitySection"`
Expected: all tests pass.

- [ ] **Step 4: Lint**

Run: `./node_modules/.bin/nx lint frontend`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/domain/spaces/components/SpaceIdentitySection.tsx \
        apps/frontend/src/domain/spaces/components/SpaceIdentitySection.test.tsx
git commit -m ":bug: fix(frontend): invalidate spaces management listing on identity update"
```

---

## Task 13: Listing-key invalidation on member changes

**Files:**
- Modify: `apps/frontend/src/domain/spaces/components/SpaceMembersList.tsx`

- [ ] **Step 1: Invalidate listing key on add / remove / role-change**

Inside `SpaceMembersList`, after each successful mutation (add via `AddSpaceMembersDialog` callback path is already in place), extend the success handlers to invalidate the management listing too.

For `removeMutation.mutate(...)`'s `onSuccess`:

```tsx
onSuccess: () => {
  pmToaster.create({ /* existing toaster */ });
  if (organization?.id) {
    queryClient.invalidateQueries({
      queryKey: ['organizations', organization.id, 'spaces', 'management'],
    });
  }
},
```

For `updateRoleMutation.mutate(...)`'s `onSuccess`: same treatment.

For the `AddSpaceMembersDialog`: the dialog's own `onSuccess` already invalidates the members key. Extend it to also invalidate the listing key. Read `AddSpaceMembersDialog.tsx` first; if invalidation lives there, edit there. Otherwise lift the invalidation to a callback prop the dialog calls on success.

Add the imports (`useQueryClient`, `useAuthContext`) if not present.

- [ ] **Step 2: Update tests**

In `SpaceMembersList.test.tsx`, add assertions that on remove/role-change success, `invalidateQueries` is called with the management listing key. If `AddSpaceMembersDialog.test.tsx` covers the add flow, mirror the assertion there.

- [ ] **Step 3: Run tests; expected: pass**

Run: `./node_modules/.bin/nx test frontend --testPathPattern="(SpaceMembersList|AddSpaceMembersDialog)"`
Expected: all tests pass.

- [ ] **Step 4: Lint**

Run: `./node_modules/.bin/nx lint frontend`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/domain/spaces/components/SpaceMembersList.tsx \
        apps/frontend/src/domain/spaces/components/SpaceMembersList.test.tsx \
        apps/frontend/src/domain/spaces/components/AddSpaceMembersDialog.tsx \
        apps/frontend/src/domain/spaces/components/AddSpaceMembersDialog.test.tsx
git commit -m ":bug: fix(frontend): invalidate spaces management listing on member changes"
```

---

## Task 14: Final validation sweep

**Files:** none (verification only).

- [ ] **Step 1: Full frontend test pass**

Run: `./node_modules/.bin/nx test frontend`
Expected: all tests pass.

- [ ] **Step 2: Full backend test pass for affected packages**

Run: `./node_modules/.bin/nx test spaces && ./node_modules/.bin/nx test api`
Expected: all tests pass.

- [ ] **Step 3: Lint sweep**

Run: `./node_modules/.bin/nx lint frontend && ./node_modules/.bin/nx lint spaces && ./node_modules/.bin/nx lint api`
Expected: no errors.

- [ ] **Step 4: Typecheck**

Run: `./node_modules/.bin/nx typecheck frontend && ./node_modules/.bin/nx typecheck api`
Expected: no errors.

- [ ] **Step 5: Manual smoke checklist (run docker-compose stack first)**

For an org admin:
1. Visit `/org/:orgSlug/settings/spaces`.
2. Click a non-default space row → drawer opens with three tabs.
3. General tab → rename + change color → Save → toast appears, listing row updates.
4. Members tab → change one member's role from Member → Admin → toaster, no error.
5. Members tab → remove a non-current-user member → confirm → toaster, member gone, listing member count drops.
6. Members tab → click Add → pick a user → submit → toaster, member added, listing member count rises.
7. Danger tab → click Delete → confirm → drawer closes, row gone from listing.
8. Click the org's default space row → drawer opens with two tabs (General, Members) — no Danger tab. Name field is disabled.

Document any issues as bugs to fix before marking the feature complete.

- [ ] **Step 6: Optional E2E test**

If time allows, add Playwright tests for the identity edit and member role change flows under `apps/e2e-tests/src/features/spaces-management/`. Follow the existing Page Object Model. The discoveries doc notes that E2E was deferred for the listing — same pragmatic deferral applies if Playwright infra isn't readily available in this session.

---

## Dependency graph

```
Task 1 ─┐
Task 2 ─┼─→ Task 4 (controller spec smoke)
Task 3 ─┘
                        Task 9 ←── Task 5 + Task 6 + Task 8 + Task 7
                            ↓
                        Task 10 (table click)
                            ↓
                        Task 11 (page wiring)
                            ↓
                        Task 12 + Task 13 (invalidations)
                            ↓
                        Task 14 (validation)
```

Backend tasks (1–4) are independent of frontend tasks (5–14). Frontend ordering is strict: lift props (5, 6) → adapt callers (7, 8) → drawer (9) → table (10) → page (11) → invalidations (12, 13) → validation (14).
