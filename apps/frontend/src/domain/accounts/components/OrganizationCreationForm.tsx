import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { PMInput, PMButton, PMFormContainer, PMField } from '@packmind/ui';
import { useSelectOrganizationMutation } from '../api/queries/AuthQueries';
import { useCreateOrganizationMutation } from '../api/queries/AccountsQueries';
import { isPackmindError } from '../../../services/api/errors/PackmindError';

export default function OrganizationCreationForm() {
  const [organizationName, setOrganizationName] = useState('');
  const [errors, setErrors] = useState<{
    organizationName?: string;
  }>({});

  const createOrganizationMutation = useCreateOrganizationMutation();
  const selectOrganizationMutation = useSelectOrganizationMutation();
  const navigate = useNavigate();

  const handleCreateOrganization = () => {
    if (!organizationName.trim()) {
      setErrors({ organizationName: 'Organization name is required' });
      return;
    }

    if (organizationName.trim().length < 3) {
      setErrors({
        organizationName: 'Organization name must be at least 3 characters',
      });
      return;
    }

    createOrganizationMutation.mutate(
      { name: organizationName.trim() },
      {
        onSuccess: (organization) => {
          selectOrganizationMutation.mutate(
            {
              organizationId: organization.id,
            },
            {
              onSuccess: () => {
                navigate(`/org/${organization.slug}`);
              },
            },
          );
        },
        onError: (error) => {
          // Use the actual error message from the server when available
          let errorMessage = 'Failed to create organization';

          if (isPackmindError(error)) {
            errorMessage = error.serverError.data.message;
          }

          setErrors({ organizationName: errorMessage });
        },
      },
    );
  };

  return (
    <PMFormContainer spacing={4} maxWidth="full">
      <PMField.Root required invalid={!!errors.organizationName}>
        <PMField.Label>
          Create Organization
          <PMField.RequiredIndicator />
        </PMField.Label>

        <PMInput
          value={organizationName}
          onChange={(e) => setOrganizationName(e.target.value)}
          placeholder="Enter organization name"
          required
          disabled={createOrganizationMutation.isPending}
          error={errors.organizationName}
        />

        <PMField.ErrorText>{errors.organizationName}</PMField.ErrorText>
      </PMField.Root>

      <PMButton
        onClick={handleCreateOrganization}
        disabled={createOrganizationMutation.isPending}
      >
        {createOrganizationMutation.isPending
          ? 'Creating...'
          : 'Create Organization'}
      </PMButton>
    </PMFormContainer>
  );
}
