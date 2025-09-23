import React from 'react';
import { OrganizationId } from '@packmind/accounts/types';
import { UsersList } from './UsersList';

interface UsersPageProps {
  organizationId: OrganizationId;
}

export const UsersPage: React.FC<UsersPageProps> = ({ organizationId }) => {
  return <UsersList organizationId={organizationId} />;
};
