import React from 'react';
import {
  PMDialog,
  PMButton,
  PMCloseButton,
  PMButtonGroup,
  PMIcon,
  PMText,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import { LuUserMinus } from 'react-icons/lu';
import { UserStatus, OrganizationId } from '@packmind/types';
import { useExcludeUserMutation } from '../api/queries/AccountsQueries';

interface ExcludeUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userStatus: UserStatus | null;
  organizationId: OrganizationId;
}

export const ExcludeUserDialog: React.FC<ExcludeUserDialogProps> = ({
  open,
  onOpenChange,
  userStatus,
  organizationId,
}) => {
  const { mutateAsync: excludeUser, isPending } = useExcludeUserMutation();

  const handleExcludeUser = async () => {
    if (!userStatus) return;

    try {
      await excludeUser({
        orgId: organizationId,
        userId: userStatus.userId,
      });

      onOpenChange(false);

      pmToaster.create({
        type: 'success',
        title: 'User Removed',
        description: `${userStatus.email} has been successfully removed from the organization.`,
      });
    } catch (error) {
      pmToaster.create({
        type: 'error',
        title: 'Failed to remove user',
        description:
          (error as Error)?.message ||
          'An unexpected error occurred while removing the user.',
      });
    }
  };

  return (
    <PMDialog.Root
      closeOnInteractOutside={false}
      open={open}
      onOpenChange={(details: { open: boolean }) => {
        onOpenChange(details.open);
      }}
      size={'md'}
    >
      <PMDialog.Backdrop />
      <PMDialog.Positioner>
        <PMDialog.Content>
          <PMDialog.Header>
            <PMDialog.Title>Remove User from Organization</PMDialog.Title>
            <PMDialog.CloseTrigger asChild>
              <PMCloseButton />
            </PMDialog.CloseTrigger>
          </PMDialog.Header>
          <PMDialog.Body>
            <PMVStack gap={4} alignItems={'flex-start'}>
              <PMText>
                Are you sure you want to remove{' '}
                <strong>{userStatus?.email}</strong> from this organization?
              </PMText>
              <PMText fontSize="sm" color="faded">
                This action cannot be undone. The user will lose access to all
                organization resources and will need to be invited again to
                rejoin.
              </PMText>
            </PMVStack>
          </PMDialog.Body>
          <PMDialog.Footer>
            <PMButtonGroup size={'sm'}>
              <PMDialog.Trigger asChild>
                <PMButton variant="tertiary" disabled={isPending}>
                  Cancel
                </PMButton>
              </PMDialog.Trigger>
              <PMButton
                variant="primary"
                onClick={handleExcludeUser}
                disabled={isPending || !userStatus}
                loading={isPending}
              >
                Remove User
              </PMButton>
            </PMButtonGroup>
          </PMDialog.Footer>
        </PMDialog.Content>
      </PMDialog.Positioner>
    </PMDialog.Root>
  );
};
