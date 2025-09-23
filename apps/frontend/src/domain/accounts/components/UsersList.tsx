import React, { useMemo } from 'react';
import {
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMEmptyState,
  PMAlert,
  PMVStack,
  PMSpinner,
} from '@packmind/ui';
import { OrganizationId } from '@packmind/accounts/types';
import { useGetUsersInMyOrganizationQuery } from '../api/queries/UserQueries';
import { User } from '@packmind/accounts/types';

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

  const tableData = useMemo<PMTableRow[]>(() => {
    if (!users) return [];

    return users.map((user: User) => ({
      id: user.id,
      username: user.username,
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

  // Define columns for the table
  const columns: PMTableColumn[] = [
    { key: 'username', header: 'Username', width: '100%', grow: true },
  ];

  return (
    <PMVStack alignItems={'stretch'} gap={0} width="full">
      {tableData.length === 0 ? (
        <PMEmptyState
          title={'No Users Found'}
          description="No users found in your organization"
        />
      ) : (
        <PMTable
          columns={columns}
          data={tableData}
          striped={true}
          hoverable={true}
          size="md"
          variant="line"
          showColumnBorder={false}
        />
      )}
    </PMVStack>
  );
};
