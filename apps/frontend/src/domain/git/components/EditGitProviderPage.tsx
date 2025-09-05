import React from 'react';
import { PMBox, PMSpinner, PMVStack } from '@packmind/ui';
import { PMText } from '@packmind/ui';
import { useNavigate } from 'react-router';
import { OrganizationId } from '@packmind/accounts/types';
import { CreateGitProviderForm } from './CreateGitProviderForm';
import { useGetGitProviderByIdQuery } from '../api/queries';
import { GitProviderId } from '@packmind/git/types';

interface EditGitProviderPageProps {
  orgSlug: string;
  organizationId: OrganizationId;
  providerId: GitProviderId;
}

export const EditGitProviderPage: React.FC<EditGitProviderPageProps> = ({
  orgSlug,
  organizationId,
  providerId,
}) => {
  const navigate = useNavigate();
  const {
    data: provider,
    isLoading,
    isError,
    error,
  } = useGetGitProviderByIdQuery(providerId);

  const handleSuccess = () => {
    navigate(`/org/${orgSlug}/git`);
  };

  const handleCancel = () => {
    navigate(`/org/${orgSlug}/git`);
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
    <PMBox className="edit-git-provider-page">
      <CreateGitProviderForm
        organizationId={organizationId}
        editingProvider={provider}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </PMBox>
  );
};
