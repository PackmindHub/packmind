import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { PMInput, PMButton, PMFormContainer, PMLabel } from '@packmind/ui';
import { organizationGateway } from '../api/gateways';

export default function GoToOrganization() {
  const [organizationSlug, setOrganizationSlug] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [isChecking, setIsChecking] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organizationSlug.trim()) {
      setError('Organization name is required');
      return;
    }

    setError(undefined);
    setIsChecking(true);

    try {
      // Check if organization exists by trying to fetch it
      await organizationGateway.getBySlug(
        organizationSlug.trim().toLowerCase(),
      );

      // If we reach here, organization exists - redirect to sign-in
      navigate(`/org/${organizationSlug.trim().toLowerCase()}/sign-in`);
    } catch {
      // Organization doesn't exist
      setError('Organization not found. Please check the name and try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const inputId = 'organization-slug';

  return (
    <form onSubmit={handleSubmit}>
      <PMFormContainer maxWidth="500px" spacing={4}>
        <PMLabel htmlFor={inputId} required>
          Organization Name
        </PMLabel>
        <PMInput
          id={inputId}
          value={organizationSlug}
          onChange={(e) => setOrganizationSlug(e.target.value)}
          placeholder="Enter organization name"
          required
          disabled={isChecking}
          error={error}
        />
        {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
        <PMButton type="submit" disabled={isChecking}>
          {isChecking ? 'Checking...' : 'Go to Organization'}
        </PMButton>
      </PMFormContainer>
    </form>
  );
}
