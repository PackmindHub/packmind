import { useMemo, useState } from 'react';
import { LuPlus } from 'react-icons/lu';

import {
  PMButton,
  PMConfirmationModal,
  PMHeading,
  PMIcon,
  PMPageSection,
  PMSpinner,
  PMVStack,
  pmToaster,
} from '@packmind/ui';

import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import {
  useGetSpaceMembersQuery,
  useRemoveMemberFromSpaceMutation,
  useUpdateMemberRoleMutation,
} from '../api/queries/SpacesQueries';
import { SpaceMemberRole } from '../types';
import { useCurrentSpace } from '../hooks/useCurrentSpace';
import { SpaceMember, SpaceMembersTable } from './SpaceMembersTable';
import { AddSpaceMembersDialog } from './AddSpaceMembersDialog';

export function SpaceMembersList() {
  const { user } = useAuthContext();
  const { spaceId, space } = useCurrentSpace();
  const currentUserId = user?.id;
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<SpaceMember | null>(
    null,
  );

  const { data, isLoading } = useGetSpaceMembersQuery(spaceId ?? '');
  const removeMutation = useRemoveMemberFromSpaceMutation(spaceId ?? '');
  const updateRoleMutation = useUpdateMemberRoleMutation(spaceId ?? '');

  const members = useMemo<SpaceMember[]>(
    () =>
      (data?.members ?? []).map((m) => ({
        id: m.userId,
        displayName: m.displayName,
        role: m.role,
      })),
    [data],
  );

  const currentUserMember = data?.members?.find(
    (m) => m.userId === currentUserId,
  );
  const isSpaceAdmin = currentUserMember?.role === 'admin';

  const handleUpdateMemberRole = (memberId: string, role: SpaceMemberRole) => {
    updateRoleMutation.mutate(
      { targetUserId: memberId, role },
      {
        onSuccess: () => {
          pmToaster.create({
            title: 'Role updated',
            description: 'Member role has been updated.',
            type: 'success',
          });
        },
        onError: () => {
          pmToaster.create({
            title: 'Failed to update role',
            description: 'An error occurred while updating the member role.',
            type: 'error',
          });
        },
      },
    );
  };

  const handleRemoveMember = (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    if (member) {
      setMemberToRemove(member);
    }
  };

  const handleConfirmRemove = () => {
    if (memberToRemove) {
      removeMutation.mutate(memberToRemove.id, {
        onSuccess: () => {
          pmToaster.create({
            title: 'Member removed',
            description: `${memberToRemove.displayName} has been removed from the space.`,
            type: 'success',
          });
        },
        onError: () => {
          pmToaster.create({
            title: 'Failed to remove member',
            description:
              'An error occurred while removing the member from the space.',
            type: 'error',
          });
        },
        onSettled: () => setMemberToRemove(null),
      });
    }
  };

  if (isLoading) {
    return <PMSpinner />;
  }

  return (
    <PMPageSection
      backgroundColor="primary"
      titleComponent={
        <PMHeading level="h3" fontSize={'lg'} fontWeight={'semibold'}>
          Members
        </PMHeading>
      }
      cta={
        isSpaceAdmin ? (
          <PMButton
            variant="primary"
            size="sm"
            onClick={() => setAddDialogOpen(true)}
          >
            <PMIcon>
              <LuPlus />
            </PMIcon>
            Add members
          </PMButton>
        ) : undefined
      }
    >
      <PMVStack align="stretch" pt={4} w="full">
        <SpaceMembersTable
          members={members}
          currentUserId={currentUserId}
          isDefaultSpace={space?.isDefaultSpace}
          isSpaceAdmin={isSpaceAdmin}
          onRemoveMember={handleRemoveMember}
          onUpdateMemberRole={handleUpdateMemberRole}
        />
        <AddSpaceMembersDialog
          open={addDialogOpen}
          setOpen={setAddDialogOpen}
          spaceId={spaceId ?? ''}
          existingMembers={members}
        />
        <PMConfirmationModal
          trigger={<span />}
          open={!!memberToRemove}
          onOpenChange={({ open }) => {
            if (!open) setMemberToRemove(null);
          }}
          title="Remove member"
          message={`Are you sure you want to remove ${memberToRemove?.displayName ?? 'this member'} from the space?`}
          confirmText="Remove"
          onConfirm={handleConfirmRemove}
          isLoading={removeMutation.isPending}
        />
      </PMVStack>
    </PMPageSection>
  );
}
