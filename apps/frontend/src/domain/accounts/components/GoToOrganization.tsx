import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  PMInput,
  PMButton,
  PMFormContainer,
  PMField,
  PMAlert,
} from '@packmind/ui';
import { organizationGateway } from '../api/gateways';

export default function GoToOrganization() {
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [isChecking, setIsChecking] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organizationName.trim()) {
      setError('Organization name is required');
      return;
    }

    setError(undefined);
    setIsChecking(true);

    try {
      // Check if organization exists by name (backend will handle slugification)
      const organization = await organizationGateway.getByName(
        organizationName.trim(),
      );

      // If we reach here, organization exists - redirect to sign-in using the slug
      navigate(`/org/${organization.slug}/sign-in`);
    } catch {
      // Organization doesn't exist
      setError('Organization not found. Please check the name and try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const inputId = 'organization-name';

  return (
    <form onSubmit={handleSubmit}>
      <PMFormContainer maxWidth="500px" spacing={4}>
        <PMField.Root required>
          <PMField.Label>
            Organization Name
            <PMField.RequiredIndicator />
          </PMField.Label>

          <PMInput
            id={inputId}
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            placeholder="Enter organization name"
            required
            disabled={isChecking}
            error={error}
          />
        </PMField.Root>

        {error && (
          <PMAlert.Root status="error">
            <PMAlert.Indicator />
            <PMAlert.Title>{error}</PMAlert.Title>
          </PMAlert.Root>
        )}
        <PMButton type="submit" disabled={isChecking}>
          {isChecking ? 'Checking...' : 'Go to organization'}
        </PMButton>
      </PMFormContainer>
    </form>
  );
}
