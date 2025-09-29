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
  PMButtonGroup,
} from '@packmind/ui';
import { useGetUserStatusesQuery } from '../api/queries/UserQueries';
import { OrganizationId, UserStatus } from '@packmind/accounts/types';
import { LuCirclePlus, LuMail } from 'react-icons/lu';
import { InviteUsersDialog } from './InviteUsers/InviteUsersDialog';
import { useInviteUsersMutation } from '../api/queries/AccountsQueries';

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
        <UserActions organizationId={organizationId} userStatus={userStatus} />
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
}> = ({ organizationId, userStatus }) => {
  const { mutateAsync: inviteUsers, isPending } = useInviteUsersMutation();

  return (
    <PMButtonGroup>
      {!userStatus.isActive && (
        <PMButton
          variant={'secondary'}
          title={'Resend invitation'}
          loading={isPending}
          onClick={() =>
            inviteUsers({ orgId: organizationId, emails: [userStatus.email] })
          }
          children={
            <PMIcon>
              <LuMail />
            </PMIcon>
          }
        />
      )}
    </PMButtonGroup>
  );
};
