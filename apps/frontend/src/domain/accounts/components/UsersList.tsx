import React, { useMemo } from 'react';
import { LuCirclePlus, LuMail, LuUserCog, LuUserMinus } from 'react-icons/lu';

import {
  PMAlert,
  PMBadge,
  PMButton,
  PMButtonGroup,
  PMEmptyState,
  PMHStack,
  PMIcon,
  PMSpinner,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMVStack,
} from '@packmind/ui';
import { OrganizationId, UserStatus } from '@packmind/accounts/types';

import { useGetUserStatusesQuery } from '../api/queries/UserQueries';
import { useInviteUsersMutation } from '../api/queries/AccountsQueries';
import { AuthContextUser, useAuthContext } from '../hooks/useAuthContext';
import { InviteUsersDialog } from './InviteUsers/InviteUsersDialog';
import { ExcludeUserDialog } from './ExcludeUserDialog';
import { ChangeUserRoleDialog } from './ChangeUserRole/ChangeUserRoleDialog';

interface UsersListProps {
  organizationId: OrganizationId;
}

export const UsersList: React.FC<UsersListProps> = ({ organizationId }) => {
  const {
    data: userStatusesData,
    isLoading,
    isError,
    error: errorMessage,
  } = useGetUserStatusesQuery();
  const [inviteUserOpened, setInviteUserOpened] = React.useState(false);
  const [changeRoleUserStatus, setChangeRoleUserStatus] =
    React.useState<UserStatus | null>(null);
  const [excludeUserState, setExcludeUserState] = React.useState<{
    isOpen: boolean;
    userStatus: UserStatus | null;
  }>({ isOpen: false, userStatus: null });

  const columns: PMTableColumn[] = [
    { key: 'email', header: 'Email', grow: true },
    { key: 'status', header: 'Status', grow: false },
    { key: 'role', header: 'Role', grow: false },
    { key: 'actions', header: 'Actions', grow: false },
  ];

  const tableData = useMemo<PMTableRow[]>(() => {
    if (!userStatusesData) return [];

    return userStatusesData.userStatuses.map((userStatus: UserStatus) => ({
      id: userStatus.userId,
      email: userStatus.email,
      status: <UserStatusBadge userStatus={userStatus} />,
      role: <PMBadge colorPalette="blue">{userStatus.role}</PMBadge>,
      actions: (
        <UserActions
          organizationId={organizationId}
          userStatus={userStatus}
          onChangeRole={() => setChangeRoleUserStatus(userStatus)}
          onExcludeUser={(userStatus) =>
            setExcludeUserState({ isOpen: true, userStatus })
          }
        />
      ),
    }));
  }, [userStatusesData, organizationId]);

  if (isLoading) {
    return (
      <PMEmptyState
        icon={<PMSpinner />}
        title="Loading Users..."
        description="Please wait while we fetch your organization users and invitations."
      />
    );
  }

  if (isError) {
    return (
      <PMAlert.Root status="error" my={4}>
        <PMAlert.Indicator />
        <PMAlert.Title>Error Loading Data</PMAlert.Title>
        <PMAlert.Description>
          Sorry, we couldn't load your organization users or invitations.{' '}
          {errorMessage && `Error: ${errorMessage.message}`}
        </PMAlert.Description>
      </PMAlert.Root>
    );
  }

  return (
    <PMVStack alignItems={'stretch'} gap={0} width="full">
      {tableData.length === 0 ? (
        <PMEmptyState
          title={'No Users Found'}
          description="No users found in your organization"
        />
      ) : (
        <>
          <PMHStack justifyContent={'flex-end'}>
            <PMButton
              variant="primary"
              size="xs"
              onClick={() => setInviteUserOpened(true)}
            >
              <PMIcon>
                <LuCirclePlus />
              </PMIcon>
              Invite users
            </PMButton>
          </PMHStack>
          <PMTable
            columns={columns}
            data={tableData}
            striped={true}
            hoverable={true}
            size="md"
            variant="line"
            showColumnBorder={false}
          />
        </>
      )}
      {inviteUserOpened && (
        <InviteUsersDialog
          open={inviteUserOpened}
          setOpen={setInviteUserOpened}
        />
      )}
      {changeRoleUserStatus && (
        <ChangeUserRoleDialog
          open={!!changeRoleUserStatus}
          setOpen={(open) => !open && setChangeRoleUserStatus(null)}
          userStatus={changeRoleUserStatus}
        />
      )}
      {excludeUserState.isOpen && (
        <ExcludeUserDialog
          open={excludeUserState.isOpen}
          onOpenChange={(open) =>
            setExcludeUserState({
              isOpen: open,
              userStatus: open ? excludeUserState.userStatus : null,
            })
          }
          userStatus={excludeUserState.userStatus}
          organizationId={organizationId}
        />
      )}
    </PMVStack>
  );
};

const UserStatusBadge: React.FunctionComponent<{
  userStatus: UserStatus;
}> = ({ userStatus }) => {
  if (userStatus.isActive) {
    return <PMBadge colorPalette="green">Active</PMBadge>;
  }

  switch (userStatus.invitationStatus) {
    case 'pending':
      return <PMBadge colorPalette="blue">Invitation pending</PMBadge>;
    case 'expired':
      return <PMBadge colorPalette="red">Invitation expired</PMBadge>;
    case 'accepted':
      return <PMBadge colorPalette="green">Invitation accepted</PMBadge>;
    case 'none':
      return <PMBadge colorPalette="gray">No invitation</PMBadge>;
    default:
      return <PMBadge colorPalette="gray">Unknown status</PMBadge>;
  }
};

const UserActions: React.FunctionComponent<{
  organizationId: OrganizationId;
  userStatus: UserStatus;
  currentUser?: AuthContextUser;
  onChangeRole: () => void;
  onExcludeUser: (userStatus: UserStatus) => void;
}> = ({ organizationId, userStatus, onChangeRole, onExcludeUser }) => {
  const { mutateAsync: inviteUsers, isPending } = useInviteUsersMutation();
  const { user: currentUser, organization } = useAuthContext();

  // Don't show change role action for current user or if user is not admin
  const isCurrentUser = currentUser?.id === userStatus.userId;
  const isCurrentUserAdmin = organization?.role === 'admin';

  return (
    <PMButtonGroup>
      {!userStatus.isActive && (
        <PMButton
          variant={'secondary'}
          size="sm"
          title={'Resend invitation'}
          loading={isPending}
          onClick={() =>
            inviteUsers({
              orgId: organizationId,
              emails: [userStatus.email],
              role: userStatus.role,
            })
          }
          children={
            <PMIcon>
              <LuMail />
            </PMIcon>
          }
        />
      )}
      {userStatus.isActive && isCurrentUserAdmin && (
        <>
          <PMButton
            variant={'secondary'}
            size="sm"
            title={
              isCurrentUser ? 'Cannot change your own role' : 'Change user role'
            }
            onClick={onChangeRole}
            disabled={isCurrentUser}
            children={
              <PMIcon>
                <LuUserCog />
              </PMIcon>
            }
          />
          <PMButton
            variant={'secondary'}
            size="sm"
            title={
              isCurrentUser
                ? 'Cannot remove yourself from organization'
                : 'Remove user from organization'
            }
            onClick={() => onExcludeUser(userStatus)}
            disabled={isCurrentUser}
            children={
              <PMIcon>
                <LuUserMinus />
              </PMIcon>
            }
          />
        </>
      )}
    </PMButtonGroup>
  );
};
