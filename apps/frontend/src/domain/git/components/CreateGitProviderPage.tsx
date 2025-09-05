import React from 'react';
import { PMBox } from '@packmind/ui';
import { useNavigate } from 'react-router';
import { OrganizationId } from '@packmind/accounts/types';
import { CreateGitProviderForm } from './CreateGitProviderForm';

interface CreateGitProviderPageProps {
  orgSlug: string;
  organizationId: OrganizationId;
}

export const CreateGitProviderPage: React.FC<CreateGitProviderPageProps> = ({
  orgSlug,
  organizationId,
}) => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate(`/org/${orgSlug}/git`);
  };

  const handleCancel = () => {
    navigate(`/org/${orgSlug}/git`);
  };

  return (
    <PMBox className="create-git-provider-page">
      <CreateGitProviderForm
        organizationId={organizationId}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </PMBox>
  );
};
