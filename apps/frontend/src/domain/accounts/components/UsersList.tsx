import React, { useMemo } from 'react';
import {
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMEmptyState,
  PMAlert,
  PMVStack,
  PMSpinner,
  PMBadge,
  PMButton,
  PMIcon,
  PMHStack,
} from '@packmind/ui';
import { useGetUsersInMyOrganizationQuery } from '../api/queries/UserQueries';
import { Invitation, OrganizationId, User } from '@packmind/accounts/types';
import { LuCirclePlus } from 'react-icons/lu';
import { InviteUsersDialog } from './InviteUsers/InviteUsersDialog';

interface UsersListProps {
  organizationId: OrganizationId;
}

export const UsersList: React.FC<UsersListProps> = ({ organizationId }) => {
  const {
    data: users,
    isLoading,
    isError,
    error,
  } = useGetUsersInMyOrganizationQuery();

  const [inviteUserOpened, setInviteUserOpened] = React.useState(false);

  const columns: PMTableColumn[] = [
    { key: 'email', header: 'Email', grow: true },
    { key: 'status', header: 'Status', grow: true },
    { key: 'role', header: 'Role', grow: true },
  ];

  const tableData = useMemo<PMTableRow[]>(() => {
    if (!users) return [];

    return users.map((user: User) => ({
      id: user.id,
      email: user.email,
      status: (
        <UserStatusBadge
          user={user}
          invitation={
            { expirationDate: new Date(2025, 10, 12) } as unknown as Invitation
          }
        />
      ),
      role: <PMBadge colorPalette="blue">Admin</PMBadge>, // Placeholder role, replace with actual role if available (member | admin)
    }));
  }, [users]);

  if (isLoading) {
    return (
      <PMEmptyState
        icon={<PMSpinner />}
        title="Loading Users..."
        description="Please wait while we fetch your organization users."
      />
    );
  }

  if (isError) {
    return (
      <PMAlert.Root status="error" my={4}>
        <PMAlert.Indicator />
        <PMAlert.Title>Error Loading Users</PMAlert.Title>
        <PMAlert.Description>
          Sorry, we couldn't load your organization users.{' '}
          {error && `Error: ${error.message}`}
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
    </PMVStack>
  );
};

const UserStatusBadge: React.FunctionComponent<{
  user: User;
  invitation: Invitation;
}> = ({ user, invitation }) => {
  if (user.active) {
    return <PMBadge colorPalette="green">Active</PMBadge>;
  }

  if (invitation.expirationDate < new Date(Date.now())) {
    return <PMBadge colorPalette="red">Invitation expired</PMBadge>;
  }

  return <PMBadge colorPalette="yellow">Invitation pending</PMBadge>;
};
