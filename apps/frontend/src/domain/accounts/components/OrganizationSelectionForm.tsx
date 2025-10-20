import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  PMButton,
  PMFormContainer,
  PMField,
  PMNativeSelect,
} from '@packmind/ui';
import { useSelectOrganizationMutation } from '../api/queries/AuthQueries';
import { SignInUserResponse } from '@packmind/accounts/types';
import { isPackmindError } from '../../../services/api/errors/PackmindError';
import { routes } from '../../../shared/utils/routes';

interface OrganizationSelectionFormProps {
  signInResult: SignInUserResponse;
}

export default function OrganizationSelectionForm({
  signInResult,
}: OrganizationSelectionFormProps) {
  const [selectedOrganizationSlug, setSelectedOrganizationSlug] = useState('');
  const [errors, setErrors] = useState<{
    organization?: string;
  }>({});

  const selectOrganizationMutation = useSelectOrganizationMutation();
  const navigate = useNavigate();

  const handleOrganizationSelect = () => {
    if (!selectedOrganizationSlug || !signInResult) {
      setErrors({ organization: 'Please select an organization' });
      return;
    }

    // Find the selected organization from the results to get its ID
    const selectedOrg = signInResult.organizations?.find(
      (org) => org.organization.slug === selectedOrganizationSlug,
    );

    if (!selectedOrg) {
      setErrors({ organization: 'Selected organization not found' });
      return;
    }

    // Call the selectOrganization API
    selectOrganizationMutation.mutate(
      { organizationId: selectedOrg.organization.id },
      {
        onSuccess: () => {
          // Navigate to the selected organization
          navigate(routes.org.toDashboard(selectedOrganizationSlug));
        },
        onError: (error) => {
          // Use the actual error message from the server when available
          let errorMessage = 'Failed to select organization';

          if (isPackmindError(error)) {
            errorMessage = error.serverError.data.message;
          }

          setErrors({ organization: errorMessage });
        },
      },
    );
  };

  const organizationItems = (signInResult.organizations || []).map(
    ({ organization }) => ({
      label: `${organization.name}`,
      value: organization.slug,
    }),
  );

  return (
    <PMFormContainer spacing={4} maxWidth="full">
      <PMField.Root required invalid={!!errors.organization}>
        <PMField.Label>
          Select Organization
          <PMField.RequiredIndicator />
        </PMField.Label>

        <PMNativeSelect
          items={[
            { label: 'Choose an organization', value: '', disabled: false },
            ...organizationItems,
          ]}
          value={selectedOrganizationSlug}
          onChange={(e) => setSelectedOrganizationSlug(e.target.value)}
        />

        <PMField.ErrorText>{errors.organization}</PMField.ErrorText>
      </PMField.Root>

      <PMButton
        onClick={handleOrganizationSelect}
        disabled={selectOrganizationMutation.isPending}
      >
        {selectOrganizationMutation.isPending
          ? 'Selecting...'
          : 'Continue to Organization'}
      </PMButton>
    </PMFormContainer>
  );
}
