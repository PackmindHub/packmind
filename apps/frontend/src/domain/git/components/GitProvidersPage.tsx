import React, { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { OrganizationId } from '@packmind/accounts/types';
import { GitProvidersList } from './GitProvidersList';
import { GitProviderUI } from '../types/GitProviderTypes';

interface GitProvidersPageProps {
  orgSlug: string;
  organizationId: OrganizationId;
}

export const GitProvidersPage: React.FC<GitProvidersPageProps> = ({
  orgSlug,
  organizationId,
}) => {
  const navigate = useNavigate();

  const handleCreateProvider = useCallback(() => {
    navigate(`/org/${orgSlug}/git/providers/create`);
  }, [navigate, orgSlug]);

  const handleEditProvider = useCallback(
    (provider: GitProviderUI) => {
      navigate(`/org/${orgSlug}/git/providers/${provider.id}/edit`);
    },
    [navigate, orgSlug],
  );

  const handleManageRepositories = useCallback(
    (provider: GitProviderUI) => {
      navigate(`/org/${orgSlug}/git/providers/${provider.id}/repositories`);
    },
    [navigate, orgSlug],
  );

  return (
    <GitProvidersList
      organizationId={organizationId}
      onCreateProvider={handleCreateProvider}
      onEditProvider={handleEditProvider}
      onManageRepositories={handleManageRepositories}
    />
  );
};
