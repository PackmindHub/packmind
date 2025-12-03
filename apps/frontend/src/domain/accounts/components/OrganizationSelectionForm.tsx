import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  PMButton,
  PMFormContainer,
  PMField,
  PMNativeSelect,
} from '@packmind/ui';
import { useSelectOrganizationMutation } from '../api/queries/AuthQueries';
import { SignInUserResponse } from '@packmind/types';
import { isPackmindError } from '../../../services/api/errors/PackmindError';
import { routes } from '../../../shared/utils/routes';

interface OrganizationSelectionFormProps {
  signInResult: SignInUserResponse;
  returnUrl?: string | null;
}

export default function OrganizationSelectionForm({
  signInResult,
  returnUrl,
}: OrganizationSelectionFormProps) {
  const [selectedOrganizationSlug, setSelectedOrganizationSlug] = useState('');
  const [errors, setErrors] = useState<{
    organization?: string;
  }>({});

  const selectOrganizationMutation = useSelectOrganizationMutation();
  const navigate = useNavigate();

  const getRedirectUrl = (orgSlug: string) => {
    // If returnUrl is provided and starts with /, use it (must be an internal path)
    if (returnUrl && returnUrl.startsWith('/')) {
      return returnUrl;
    }
    return routes.org.toDashboard(orgSlug);
  };

  const handleOrganizationSelect = async () => {
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

    try {
      // Call the selectOrganization API and wait for query cleanup to complete
      await selectOrganizationMutation.mutateAsync({
        organizationId: selectedOrg.organization.id,
      });

      // Navigate to the return URL or the selected organization's dashboard
      navigate(getRedirectUrl(selectedOrganizationSlug));
    } catch (error) {
      // Use the actual error message from the server when available
      let errorMessage = 'Failed to select organization';

      if (isPackmindError(error)) {
        errorMessage = error.serverError.data.message;
      }

      setErrors({ organization: errorMessage });
    }
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
