import React from 'react';
import { PMBox, PMSpinner, PMVStack } from '@packmind/ui';
import { PMText } from '@packmind/ui';
import { useNavigate } from 'react-router';
import { RepositoryList } from './RepositoryList';
import { useGetGitProviderByIdQuery } from '../api/queries';
import { GitProviderId } from '@packmind/git/types';

interface GitRepositoriesPageProps {
  orgSlug: string;
  providerId: GitProviderId;
}

export const GitRepositoriesPage: React.FC<GitRepositoriesPageProps> = ({
  orgSlug,
  providerId,
}) => {
  const navigate = useNavigate();
  const {
    data: provider,
    isLoading,
    isError,
    error,
  } = useGetGitProviderByIdQuery(providerId);

  const handleAddRepository = () => {
    navigate(`/org/${orgSlug}/git/providers/${providerId}/repositories/add`);
  };

  if (isLoading) {
    return (
      <PMBox p={4} borderRadius="md" shadow="sm">
        <PMVStack gap={4}>
          <PMSpinner size="lg" />
          <PMText variant="body">Loading git provider...</PMText>
        </PMVStack>
      </PMBox>
    );
  }

  if (isError) {
    return (
      <PMBox
        p={4}
        borderRadius="md"
        shadow="sm"
        borderLeft="4px solid"
        borderLeftColor="red.500"
      >
        <PMText variant="body" color="error">
          Error loading git provider: {error?.message || 'Unknown error'}
        </PMText>
      </PMBox>
    );
  }

  if (!provider) {
    return (
      <PMBox p={4} borderRadius="md" shadow="sm">
        <PMText variant="body">Git provider not found.</PMText>
      </PMBox>
    );
  }

  return (
    <PMBox className="git-repositories-page">
      <RepositoryList
        provider={provider}
        onAddRepository={handleAddRepository}
      />
    </PMBox>
  );
};
