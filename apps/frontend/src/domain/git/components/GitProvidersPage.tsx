import React from 'react';
import { OrganizationId } from '@packmind/types';
import { GitProvidersList } from './GitProvidersList';

interface GitProvidersPageProps {
  organizationId: OrganizationId;
}

export const GitProvidersPage: React.FC<GitProvidersPageProps> = ({
  organizationId,
}) => {
  return <GitProvidersList organizationId={organizationId} />;
};
