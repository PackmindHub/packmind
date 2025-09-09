import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  PMInput,
  PMButton,
  PMFormContainer,
  PMField,
  PMText,
  PMAlert,
} from '@packmind/ui';
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
          navigate(`/org/${organization.slug}/sign-up`);
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
  const MAX_CHARACTERS = 64;

  return (
    <form onSubmit={handleSubmit}>
      <PMFormContainer maxWidth="500px" spacing={4}>
        <PMField.Root required>
          <PMField.Label>
            Organization Name{' '}
            {
              <PMText as="span" variant="small" color="secondary">
                ({name.length} / {MAX_CHARACTERS} max)
              </PMText>
            }
            <PMField.RequiredIndicator />
          </PMField.Label>

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
            maxLength={MAX_CHARACTERS}
          />
        </PMField.Root>
        {error && (
          <PMAlert.Root status="error">
            <PMAlert.Indicator />
            <PMAlert.Title>{error}</PMAlert.Title>
          </PMAlert.Root>
        )}
        <PMButton type="submit" disabled={createOrganizationMutation.isPending}>
          {createOrganizationMutation.isPending
            ? 'Creating...'
            : 'Create Organization'}
        </PMButton>
      </PMFormContainer>
    </form>
  );
}
