import React from 'react';
import {
  PMDialog,
  PMButton,
  PMCloseButton,
  PMButtonGroup,
  PMIcon,
  PMField,
  PMNativeSelect,
  PMVStack,
  pmToaster,
  PMText,
} from '@packmind/ui';
import { LuUserCog } from 'react-icons/lu';
import { UserOrganizationRole } from '@packmind/types';
import { UserStatus } from '@packmind/types';
import { useChangeUserRoleMutation } from '../../api/queries/AccountsQueries';

interface ChangeUserRoleDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  userStatus: UserStatus;
}

export const ChangeUserRoleDialog: React.FC<ChangeUserRoleDialogProps> = ({
  open,
  setOpen,
  userStatus,
}) => {
  const [selectedRole, setSelectedRole] = React.useState<UserOrganizationRole>(
    userStatus.role,
  );
  const { mutateAsync: changeUserRole, isPending } =
    useChangeUserRoleMutation();

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRole(e.target.value as UserOrganizationRole);
  };

  const handleOnSubmit = async () => {
    if (selectedRole === userStatus.role) {
      pmToaster.create({
        type: 'info',
        title: 'No changes',
        description: 'The selected role is the same as the current role.',
      });
      return;
    }

    try {
      await changeUserRole({
        targetUserId: userStatus.userId,
        newRole: selectedRole,
      });

      setOpen(false);

      pmToaster.create({
        type: 'success',
        title: 'Role changed successfully',
        description: `${userStatus.email}'s role has been changed to ${selectedRole}.`,
      });
    } catch (error) {
      pmToaster.create({
        type: 'error',
        title: 'Failed to change role',
        description:
          (error as Error)?.message || 'An unexpected error occurred.',
      });
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedRole(userStatus.role); // Reset to original role
  };

  return (
    <PMDialog.Root
      closeOnInteractOutside={false}
      open={open}
      onOpenChange={(details: { open: boolean }) => {
        if (!details.open) {
          handleClose();
        }
      }}
      size={'md'}
      scrollBehavior={'inside'}
    >
      <PMDialog.Backdrop />
      <PMDialog.Positioner>
        <PMDialog.Content>
          <PMDialog.Header>
            <PMDialog.Title>Change User Role</PMDialog.Title>
            <PMDialog.CloseTrigger asChild>
              <PMCloseButton />
            </PMDialog.CloseTrigger>
          </PMDialog.Header>
          <PMDialog.Body>
            <PMVStack gap={4} alignItems={'flex-start'}>
              <PMText>
                Change the role for <strong>{userStatus.email}</strong> in your
                organization.
              </PMText>

              <PMField.Root width={'fit-content'}>
                <PMField.Label>New Role</PMField.Label>
                <PMNativeSelect
                  value={selectedRole}
                  onChange={handleRoleChange}
                  items={[
                    { value: 'admin', label: 'Admin' },
                    { value: 'member', label: 'Member' },
                  ]}
                />
                <PMField.HelperText>
                  {selectedRole === 'admin'
                    ? 'Admins can manage users, settings, and organization data.'
                    : 'Members have standard access to organization features.'}
                </PMField.HelperText>
              </PMField.Root>
            </PMVStack>
          </PMDialog.Body>
          <PMDialog.Footer>
            <PMButtonGroup size={'sm'}>
              <PMButton variant="tertiary" onClick={handleClose}>
                Cancel
              </PMButton>
              <PMButton
                variant="primary"
                onClick={handleOnSubmit}
                disabled={isPending || selectedRole === userStatus.role}
                loading={isPending}
              >
                <PMIcon>
                  <LuUserCog />
                </PMIcon>
                Change Role
              </PMButton>
            </PMButtonGroup>
          </PMDialog.Footer>
        </PMDialog.Content>
      </PMDialog.Positioner>
    </PMDialog.Root>
  );
};
