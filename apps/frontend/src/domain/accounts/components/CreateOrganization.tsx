import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { PMInput, PMButton, PMFormContainer, PMLabel } from '@packmind/ui';
import { useCreateOrganizationMutation } from '../api/queries';
import { isPackmindConflictError } from '../../../services/api/errors/PackmindConflictError';

export default function CreateOrganization() {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const createOrganizationMutation = useCreateOrganizationMutation();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Organization name is required');
      return;
    }
    setError(undefined);
    createOrganizationMutation.mutate(
      { name: name.trim() },
      {
        onSuccess: (organization) => {
          // Redirect to organization login page after creation
          navigate(`/org/${organization.slug}/sign-in`);
        },
        onError: (error: unknown) => {
          if (isPackmindConflictError(error)) {
            setError(error.serverError.data.message);
          } else {
            setError('Failed to create organization. Please try again.');
          }
        },
      },
    );
  };

  const inputId = 'organization-name';

  return (
    <form onSubmit={handleSubmit}>
      <PMFormContainer maxWidth="500px" spacing={4}>
        <PMLabel htmlFor={inputId} required>
          Organization Name
        </PMLabel>
        <PMInput
          id={inputId}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(undefined);
          }}
          placeholder="Enter organization name"
          required
          disabled={createOrganizationMutation.isPending}
          error={error}
        />
        {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
        <PMButton type="submit" disabled={createOrganizationMutation.isPending}>
          {createOrganizationMutation.isPending
            ? 'Creating...'
            : 'Create Organization'}
        </PMButton>
      </PMFormContainer>
    </form>
  );
}
