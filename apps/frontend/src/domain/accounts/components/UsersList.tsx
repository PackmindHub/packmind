import React, { useMemo } from 'react';
import {
  LuCirclePlus,
  LuLink,
  LuMail,
  LuUserCog,
  LuUserMinus,
} from 'react-icons/lu';

import {
  PMAlert,
  PMBadge,
  PMButton,
  PMCopiable,
  PMEllipsisMenu,
  PMEllipsisMenuProps,
  PMEmptyState,
  PMHStack,
  PMIcon,
  PMSpinner,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMText,
  pmToaster,
  PMVStack,
} from '@packmind/ui';
import { OrganizationId, UserStatus } from '@packmind/types';

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
  const { mutateAsync: inviteUsers } = useInviteUsersMutation();
  const { user: currentUser, organization } = useAuthContext();

  if (organization?.role !== 'admin') return null;

  // Don't show change role action for current user or if user is not admin
  const isCurrentUser = currentUser?.id === userStatus.userId;

  async function onResendInvitation() {
    await inviteUsers({
      emails: [userStatus.email],
      role: userStatus.role,
    });
  }

  function onInvitationLinkCopied() {
    pmToaster.create({
      type: 'info',
      title: 'The invitation link has been copied to your clipboard',
    });
  }

  const menuOptions: PMEllipsisMenuProps = {
    disabled: isCurrentUser,
    actions: [],
  };

  if (userStatus.isActive) {
    menuOptions.actions.push({
      value: 'change-role',
      content: (
        <PMHStack gap={2}>
          <PMIcon>
            <LuUserCog />
          </PMIcon>
          <PMText color="secondary">Change role</PMText>
        </PMHStack>
      ),
      onClick: onChangeRole,
    });

    menuOptions.actions.push({
      value: 'remove-user',
      content: (
        <PMHStack gap={2}>
          <PMIcon>
            <LuUserMinus />
          </PMIcon>
          <PMText color="error">Remove user from organization</PMText>
        </PMHStack>
      ),
      onClick: () => onExcludeUser(userStatus),
    });
  } else {
    menuOptions.actions.push({
      value: 'resend-invitation',
      content: (
        <PMHStack gap={2}>
          <PMIcon>
            <LuMail />
          </PMIcon>
          <PMText color="secondary">Resend invitation</PMText>
        </PMHStack>
      ),
      onClick: onResendInvitation,
    });

    if (
      userStatus.invitationStatus === 'pending' &&
      userStatus.invitationLink
    ) {
      menuOptions.actions.push({
        value: 'copy-invitation-link',
        content: (
          <PMCopiable.Root value={userStatus.invitationLink}>
            <PMCopiable.Trigger asChild>
              <PMHStack gap={2}>
                <PMIcon>
                  <LuLink />
                </PMIcon>
                <PMText color="secondary">Copy invitation link</PMText>
              </PMHStack>
            </PMCopiable.Trigger>
          </PMCopiable.Root>
        ),
        onClick: onInvitationLinkCopied,
      });
    }
  }

  return <PMEllipsisMenu {...menuOptions} />;
};
