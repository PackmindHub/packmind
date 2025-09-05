import React from 'react';
import { PMVStack, PMHStack, PMBox, PMSpinner, PMText } from '@packmind/ui';
import { useGetUsersInMyOrganizationQuery } from '../api/queries/UserQueries';
import { User } from '@packmind/accounts/types';

export interface OrganizationUsersListProps {
  title?: string;
  showCount?: boolean;
}

export const OrganizationUsersList: React.FC<OrganizationUsersListProps> = ({
  title = 'Organization Members',
  showCount = true,
}) => {
  const { data: users, isLoading, error } = useGetUsersInMyOrganizationQuery();

  if (isLoading) {
    return (
      <PMBox>
        <PMVStack align="stretch" gap={4}>
          <PMHStack justify="space-between" align="center">
            <PMText variant="body-important">{title}</PMText>
          </PMHStack>
          <PMHStack justify="center" py={8}>
            <PMSpinner size="md" />
            <PMText>Loading organization members...</PMText>
          </PMHStack>
        </PMVStack>
      </PMBox>
    );
  }

  if (error) {
    return (
      <PMBox>
        <PMVStack align="stretch" gap={4}>
          <PMHStack justify="space-between" align="center">
            <PMText variant="body-important">{title}</PMText>
          </PMHStack>
          <PMBox
            p={4}
            borderRadius="md"
            bg="red.50"
            borderColor="red.200"
            borderWidth="1px"
          >
            <PMText>
              Failed to load organization members. Please try again.
            </PMText>
          </PMBox>
        </PMVStack>
      </PMBox>
    );
  }

  if (!users || users.length === 0) {
    return (
      <PMBox>
        <PMVStack align="stretch" gap={4}>
          <PMHStack justify="space-between" align="center">
            <PMText variant="body-important">{title}</PMText>
            {showCount && <PMText variant="small">0 members</PMText>}
          </PMHStack>
          <PMBox
            p={4}
            borderRadius="md"
            borderColor="gray.200"
            borderWidth="1px"
            textAlign="center"
          >
            <PMText>No members found in your organization.</PMText>
          </PMBox>
        </PMVStack>
      </PMBox>
    );
  }

  return (
    <PMBox>
      <PMVStack align="stretch" gap={4}>
        <PMHStack justify="space-between" align="center">
          <PMText variant="body-important">{title}</PMText>
          {showCount && (
            <PMText variant="small">
              {users.length} member{users.length !== 1 ? 's' : ''}
            </PMText>
          )}
        </PMHStack>

        <PMVStack align="stretch" gap={2}>
          {users.map((user: User) => (
            <UserListItem key={user.id} user={user} />
          ))}
        </PMVStack>
      </PMVStack>
    </PMBox>
  );
};

interface UserListItemProps {
  user: User;
}

const UserListItem: React.FC<UserListItemProps> = ({ user }) => {
  return (
    <PMBox p={3} borderRadius="md" borderWidth="1px" transition="all 0.2s">
      <PMHStack justify="space-between" align="center">
        <PMVStack align="start">
          <PMText variant="body-important">{user.username}</PMText>
          <PMText variant="small">User ID: {user.id}</PMText>
        </PMVStack>

        <PMBox
          px={2}
          py={1}
          borderRadius="sm"
          bg="blue.1000"
          borderColor="blue.200"
          borderWidth="1px"
        >
          <PMText variant="small">Member</PMText>
        </PMBox>
      </PMHStack>
    </PMBox>
  );
};
