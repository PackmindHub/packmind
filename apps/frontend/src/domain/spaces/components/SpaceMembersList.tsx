import { useMemo, useState } from 'react';
import { LuPlus } from 'react-icons/lu';
import { useQueryClient } from '@tanstack/react-query';

import {
  PMAlert,
  PMButton,
  PMConfirmationModal,
  PMHeading,
  PMIcon,
  PMPageSection,
  PMSpinner,
  PMText,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import { Space } from '@packmind/types';

import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import {
  useGetSpaceMembersQuery,
  useRemoveMemberFromSpaceMutation,
  useUpdateMemberRoleMutation,
} from '../api/queries/SpacesQueries';
import { SpaceMemberRole } from '../types';
import { SpaceMember, SpaceMembersTable } from './SpaceMembersTable';
import { AddSpaceMembersDialog } from './AddSpaceMembersDialog';

interface SpaceMembersListProps {
  space: Space;
  isSpaceAdmin: boolean;
}

export function SpaceMembersList({
  space,
  isSpaceAdmin,
}: Readonly<SpaceMembersListProps>) {
  const { user, organization } = useAuthContext();
  const currentUserId = user?.id;
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<SpaceMember | null>(
    null,
  );

  const { data, isLoading, isError, refetch } = useGetSpaceMembersQuery(
    space.id,
  );
  const removeMutation = useRemoveMemberFromSpaceMutation(space.id);
  const updateRoleMutation = useUpdateMemberRoleMutation(space.id);

  const invalidateManagementListing = () => {
    if (organization?.id) {
      queryClient.invalidateQueries({
        queryKey: ['organizations', organization.id, 'spaces', 'management'],
      });
    }
  };

  const members = useMemo<SpaceMember[]>(
    () =>
      (data?.members ?? []).map((m) => ({
        id: m.userId,
        displayName: m.displayName,
        role: m.role,
      })),
    [data],
  );

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
          invalidateManagementListing();
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
          invalidateManagementListing();
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
        {isError ? (
          <PMAlert.Root status="error" size="sm">
            <PMAlert.Indicator />
            <PMVStack align="stretch" gap={2} flex={1}>
              <PMAlert.Title>Failed to load members</PMAlert.Title>
              <PMAlert.Description>
                Something went wrong while loading the member list.
              </PMAlert.Description>
              <PMButton
                size="xs"
                variant="secondary"
                alignSelf="flex-start"
                onClick={() => refetch()}
              >
                Retry
              </PMButton>
            </PMVStack>
          </PMAlert.Root>
        ) : members.length === 0 ? (
          <PMVStack
            align="center"
            justify="center"
            py={8}
            gap={1}
            border="solid 1px {colors.border.tertiary}"
            borderRadius="md"
          >
            <PMText fontWeight="medium">No members yet</PMText>
            <PMText variant="body" color="secondary" fontSize="sm">
              {isSpaceAdmin
                ? 'Add members to give them access to this space.'
                : 'No one has been added to this space.'}
            </PMText>
          </PMVStack>
        ) : (
          <SpaceMembersTable
            members={members}
            currentUserId={currentUserId}
            isDefaultSpace={space.isDefaultSpace}
            isSpaceAdmin={isSpaceAdmin}
            isUpdatingRole={updateRoleMutation.isPending}
            isRemovingMember={removeMutation.isPending}
            onRemoveMember={handleRemoveMember}
            onUpdateMemberRole={handleUpdateMemberRole}
          />
        )}
        <AddSpaceMembersDialog
          open={addDialogOpen}
          setOpen={setAddDialogOpen}
          spaceId={space.id}
          existingMembers={members}
          onSuccess={invalidateManagementListing}
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
